import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DeadlinkConfig } from "./types.js";

const DEFAULT_SOURCE_GLOBS = [
  "src/**/*.{tsx,ts,json,po}",
  "src/data/*.json",
];

const DEFAULT_SKIP_PATTERNS = [
  "images\\.ctfassets\\.net",
  "linkedin\\.com",
  "x\\.com",
  "googletagmanager\\.com",
  "rollbar\\.com",
  "netlify\\.com",
];

export function loadConfig(configPath: string): DeadlinkConfig {
  const absolutePath = resolve(configPath);
  const raw = readFileSync(absolutePath, "utf8");
  const parsed = parseYaml(raw) as Partial<DeadlinkConfig>;

  if (!parsed.siteUrl) {
    throw new Error(`Missing required field "siteUrl" in ${absolutePath}`);
  }

  return {
    siteUrl: parsed.siteUrl.replace(/\/$/, ""),
    locales: parsed.locales ?? ["en"],
    publicRoutes: parsed.publicRoutes ?? ["/"],
    sourceGlobs: parsed.sourceGlobs ?? DEFAULT_SOURCE_GLOBS,
    skipPatterns: parsed.skipPatterns ?? DEFAULT_SKIP_PATTERNS,
    dynamicUrlSamples: parsed.dynamicUrlSamples,
  };
}
