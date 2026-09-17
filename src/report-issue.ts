import type github from "@actions/github";

type Octokit = ReturnType<typeof github.getOctokit>;
import type { DeadlinkReport, ValidationResult } from "./types.js";

const ISSUE_TITLE = "Dead Links";

function formatReference(ref: ValidationResult["references"][number]): string {
  if (ref.source && ref.line) {
    return `\`${ref.source}:${ref.line}\``;
  }
  if (ref.parentPage) {
    return ref.parentPage;
  }
  return "unknown";
}

function formatByUrl(broken: ValidationResult[]): string {
  return broken
    .map((result) => {
      const refs = result.references.map(formatReference).join(", ");
      const status = result.status ? ` (HTTP ${result.status})` : "";
      const error = result.error ? ` — ${result.error}` : "";
      return `- [ ] \`${result.url}\`${status}${error}\n  - Found in: ${refs}`;
    })
    .join("\n\n");
}

function formatBySourceFile(broken: ValidationResult[]): string {
  const bySource = new Map<string, Set<string>>();

  for (const result of broken) {
    for (const ref of result.references) {
      if (!ref.source || !ref.line) {
        continue;
      }
      const key = `${ref.source}:${ref.line}`;
      const urls = bySource.get(key) ?? new Set<string>();
      urls.add(result.url);
      bySource.set(key, urls);
    }
  }

  if (bySource.size === 0) {
    return "_No source file references for broken links._";
  }

  return [...bySource.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, urls]) => {
      const urlList = [...urls].map((url) => `\`${url}\``).join(", ");
      return `- [ ] \`${source}\`\n  - ${urlList}`;
    })
    .join("\n\n");
}

function formatByLivePage(broken: ValidationResult[]): string {
  const byPage = new Map<string, Set<string>>();

  for (const result of broken) {
    for (const ref of result.references) {
      if (!ref.parentPage) {
        continue;
      }
      const urls = byPage.get(ref.parentPage) ?? new Set<string>();
      urls.add(result.url);
      byPage.set(ref.parentPage, urls);
    }
  }

  if (byPage.size === 0) {
    return "_No live page references for broken links._";
  }

  return [...byPage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([page, urls]) => {
      const urlList = [...urls].map((url) => `\`${url}\``).join(", ");
      return `- [ ] \`${page}\`\n  - ${urlList}`;
    })
    .join("\n\n");
}

export function formatIssueBody(report: DeadlinkReport): string {
  const broken = report.results.filter((result) => !result.ok && !result.skipped);

  return [
    `Last scan: ${report.scannedAt}`,
    "",
    `Scanned ${report.uniqueUrlCount} unique URLs (${report.sourceLinkCount} from source, ${report.liveLinkCount} from live crawl).`,
    "",
    "## Dead Links by URL",
    "",
    formatByUrl(broken),
    "",
    "## Dead Links by Source File",
    "",
    formatBySourceFile(broken),
    "",
    "## Dead Links by Live Page",
    "",
    formatByLivePage(broken),
  ].join("\n");
}

export async function reportIssue(
  octokit: Octokit,
  repo: { owner: string; repo: string },
  report: DeadlinkReport
): Promise<void> {
  const broken = report.results.filter((result) => !result.ok && !result.skipped);

  if (broken.length === 0) {
    console.log("No broken links found. No issue update needed.");
    return;
  }

  const body = formatIssueBody(report);
  const { data: openIssues } = await octokit.rest.issues.listForRepo({
    ...repo,
    state: "open",
    per_page: 100,
  });

  const existing = openIssues.find((issue) => issue.title === ISSUE_TITLE);

  if (existing) {
    console.log(`Updating existing issue #${existing.number}`);
    await octokit.rest.issues.update({
      ...repo,
      issue_number: existing.number,
      body,
    });
    return;
  }

  console.log("Creating new Dead Links issue");
  await octokit.rest.issues.create({
    ...repo,
    title: ISSUE_TITLE,
    body,
  });
}
