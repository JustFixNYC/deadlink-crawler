import { getInput, setFailed } from "@actions/core";
import { context as githubContext, getOctokit } from "@actions/github";
import { resolve } from "node:path";
import { runCheck } from "./run-check.js";

async function main(): Promise<void> {
  const configPath = getInput("config-path") || "deadlink.config.yml";
  const token = getInput("token");
  const skipLiveCrawl = getInput("skip-live-crawl") === "true";
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  if (!token) {
    throw new Error("Missing required input: token");
  }

  const octokit = getOctokit(token);

  await runCheck({
    workspace: resolve(workspace),
    configPath,
    skipLiveCrawl,
    github: {
      octokit,
      repo: githubContext.repo,
    },
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  try {
    setFailed(message);
  } catch {
    process.exit(1);
  }
});
