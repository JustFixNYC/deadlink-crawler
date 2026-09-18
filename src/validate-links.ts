import type { DeadlinkConfig, LinkReference, ValidationResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function shouldSkipUrl(url: string, config: DeadlinkConfig): string | null {
  if (url.startsWith("mailto:") || url.startsWith("tel:")) {
    return "non-http scheme";
  }

  if (url.startsWith("#")) {
    return "fragment-only";
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return "localhost";
    }

    if (parsed.search.includes("access_token=") || parsed.pathname.includes("/mapbox/")) {
      return "tokenized API URL";
    }
  } catch {
    return "invalid URL";
  }

  for (const pattern of config.skipPatterns) {
    if (new RegExp(pattern, "i").test(url)) {
      return `matched skip pattern: ${pattern}`;
    }
  }

  return null;
}

function dedupeKey(ref: LinkReference): string {
  return `${ref.url}::${ref.source ?? ""}::${ref.line ?? ""}::${ref.parentPage ?? ""}::${ref.origin}`;
}

export function mergeReferences(references: LinkReference[]): LinkReference[] {
  const seen = new Set<string>();
  const merged: LinkReference[] = [];

  for (const ref of references) {
    const key = dedupeKey(ref);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(ref);
  }

  return merged;
}

async function fetchWithRetry(url: string): Promise<{ status: number; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "JustFix-Deadlink-Checker/3.0 (+https://github.com/JustFixNYC/deadlink-crawler)",
        },
      });

      clearTimeout(timeout);

      if (response.status >= 200 && response.status < 300) {
        return { status: response.status };
      }

      if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return { status: response.status };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return { status: 0, error: lastError ?? "Request failed" };
}

export async function validateLinks(
  references: LinkReference[],
  config: DeadlinkConfig
): Promise<ValidationResult[]> {
  const byUrl = new Map<string, LinkReference[]>();

  for (const ref of references) {
    const skipReason = shouldSkipUrl(ref.url, config);
    if (skipReason) {
      continue;
    }

    const existing = byUrl.get(ref.url) ?? [];
    existing.push(ref);
    byUrl.set(ref.url, existing);
  }

  const results: ValidationResult[] = [];
  const urls = [...byUrl.keys()];

  console.log(`Validating ${urls.length} unique URLs...`);

  for (const url of urls) {
    const { status, error } = await fetchWithRetry(url);
    const ok = status >= 200 && status < 300;

    results.push({
      url,
      ok,
      status,
      error,
      references: byUrl.get(url) ?? [],
    });

    const symbol = ok ? "OK" : "BROKEN";
    console.log(`[${symbol}] ${status} ${url}`);
  }

  const skippedReferences = references.filter((ref) => shouldSkipUrl(ref.url, config));
  const skippedByUrl = new Map<string, LinkReference[]>();

  for (const ref of skippedReferences) {
    const reason = shouldSkipUrl(ref.url, config) ?? "skipped";
    const existing = skippedByUrl.get(`${ref.url}::${reason}`) ?? [];
    existing.push(ref);
    skippedByUrl.set(`${ref.url}::${reason}`, existing);
  }

  for (const [key, refs] of skippedByUrl.entries()) {
    const [url, skipReason] = key.split("::");
    results.push({
      url,
      ok: true,
      status: 0,
      skipped: true,
      skipReason,
      references: refs,
    });
  }

  return results;
}
