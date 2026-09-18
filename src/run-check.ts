import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type github from "@actions/github";

type Octokit = ReturnType<typeof github.getOctokit>;
import { loadConfig } from "./config.js";
import { crawlPublicRoutes } from "./crawl-public-routes.js";
import { extractSourceLinks } from "./extract-source-links.js";
import { reportIssue } from "./report-issue.js";
import { mergeReferences, validateLinks } from "./validate-links.js";
import type { DeadlinkReport, LinkReference } from "./types.js";

export type RunCheckOptions = {
  workspace: string;
  configPath: string;
  skipLiveCrawl?: boolean;
  skipGithub?: boolean;
  github?: {
    octokit: Octokit;
    repo: { owner: string; repo: string };
  };
};

export async function runCheck(options: RunCheckOptions): Promise<DeadlinkReport> {
  const absoluteConfigPath = resolve(options.workspace, options.configPath);
  const config = loadConfig(absoluteConfigPath);

  console.log(`Workspace: ${options.workspace}`);
  console.log(`Config: ${absoluteConfigPath}`);
  console.log(`Site URL: ${config.siteUrl}`);

  const sourceReferences = extractSourceLinks(options.workspace, config);
  console.log(`Found ${sourceReferences.length} links in source files`);

  let liveReferences: LinkReference[] = [];
  if (options.skipLiveCrawl) {
    console.log("Skipping live crawl");
  } else {
    liveReferences = await crawlPublicRoutes(config);
    console.log(`Found ${liveReferences.length} links from live crawl`);
  }

  const mergedReferences = mergeReferences([
    ...sourceReferences,
    ...liveReferences,
  ]);

  const validationResults = await validateLinks(mergedReferences, config);
  const brokenCount = validationResults.filter(
    (result) => !result.ok && !result.skipped
  ).length;
  const skippedCount = validationResults.filter((result) => result.skipped).length;

  const report: DeadlinkReport = {
    scannedAt: new Date().toISOString(),
    configPath: options.configPath,
    workspace: options.workspace,
    sourceLinkCount: sourceReferences.length,
    liveLinkCount: liveReferences.length,
    uniqueUrlCount: validationResults.filter((result) => !result.skipped).length,
    brokenCount,
    skippedCount,
    results: validationResults,
  };

  const reportPath = resolve(options.workspace, "deadlink-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Wrote report to ${reportPath}`);

  console.log(
    brokenCount === 0
      ? `PASSED — ${mergedReferences.length} references, 0 broken links`
      : `FAILED — detected ${brokenCount} broken links`
  );

  if (!options.skipGithub && options.github) {
    await reportIssue(options.github.octokit, options.github.repo, report);
  }

  return report;
}
