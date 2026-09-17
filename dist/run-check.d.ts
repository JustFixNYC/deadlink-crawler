import type github from "@actions/github";
type Octokit = ReturnType<typeof github.getOctokit>;
import type { DeadlinkReport } from "./types.js";
export type RunCheckOptions = {
    workspace: string;
    configPath: string;
    skipLiveCrawl?: boolean;
    skipGithub?: boolean;
    github?: {
        octokit: Octokit;
        repo: {
            owner: string;
            repo: string;
        };
    };
};
export declare function runCheck(options: RunCheckOptions): Promise<DeadlinkReport>;
export {};
