import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { globSync } from "glob";
import type { DeadlinkConfig, LinkReference } from "./types.js";

const URL_REGEX = /https?:\/\/[^\s"'<>\\`)}\]]+/g;

function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?)}\]'"]+$/, "");
}

function resolveDynamicUrl(
  url: string,
  samples?: Record<string, string>
): string | null {
  if (!url.includes("${")) {
    return url;
  }
  if (!samples) {
    return null;
  }

  let resolved = url;
  for (const [key, value] of Object.entries(samples)) {
    resolved = resolved.replaceAll(`\${${key}}`, value);
  }

  return resolved.includes("${") ? null : resolved;
}

function extractUrlsFromLine(line: string): string[] {
  const matches = line.match(URL_REGEX) ?? [];
  return matches.map(cleanUrl);
}

export function extractSourceLinks(
  workspace: string,
  config: DeadlinkConfig
): LinkReference[] {
  const references: LinkReference[] = [];

  for (const pattern of config.sourceGlobs) {
    const files = globSync(pattern, {
      cwd: workspace,
      nodir: true,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
    });

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relativePath = relative(workspace, filePath);

      lines.forEach((line, index) => {
        for (const rawUrl of extractUrlsFromLine(line)) {
          const url = resolveDynamicUrl(rawUrl, config.dynamicUrlSamples);
          if (!url) {
            continue;
          }

          references.push({
            url,
            source: relativePath,
            line: index + 1,
            origin: "source",
          });
        }
      });
    }
  }

  return references;
}
