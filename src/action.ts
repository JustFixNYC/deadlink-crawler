import core from "@actions/core";
import github from "@actions/github";
import { resolve } from "node:path";
import { runCheck } from "./run-check.js";

async function main(): Promise<void> {
  const configPath = core.getInput("config-path") || "deadlink.config.yml";
  const token = core.getInput("token");
  const skipLiveCrawl = core.getInput("skip-live-crawl") === "true";
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  if (!token) {
    throw new Error("Missing required input: token");
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  await runCheck({
    workspace: resolve(workspace),
    configPath,
    skipLiveCrawl,
    github: {
      octokit,
      repo: context.repo,
    },
  });
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
