import { resolve } from "node:path";
import { runCheck } from "./run-check.js";

function parseArgs(argv: string[]): {
  configPath: string;
  workspace: string;
  skipLiveCrawl: boolean;
} {
  let configPath = "deadlink.config.yml";
  let workspace = process.cwd();
  let skipLiveCrawl = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) {
      configPath = argv[++i];
    } else if (arg === "--workspace" && argv[i + 1]) {
      workspace = argv[++i];
    } else if (arg === "--skip-live-crawl") {
      skipLiveCrawl = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: deadlink-check [--config path] [--workspace path] [--skip-live-crawl]

Options:
  --config           Path to deadlink.config.yml (default: deadlink.config.yml)
  --workspace        Project root to scan (default: current directory)
  --skip-live-crawl  Only scan source files, skip Playwright crawl
`);
      process.exit(0);
    }
  }

  return {
    configPath,
    workspace: resolve(workspace),
    skipLiveCrawl,
  };
}

const options = parseArgs(process.argv.slice(2));

runCheck({
  ...options,
  skipGithub: true,
}).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
