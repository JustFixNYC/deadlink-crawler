import type github from "@actions/github";
type Octokit = ReturnType<typeof github.getOctokit>;
import type { DeadlinkReport } from "./types.js";
export declare function formatIssueBody(report: DeadlinkReport): string;
export declare function reportIssue(octokit: Octokit, repo: {
    owner: string;
    repo: string;
}, report: DeadlinkReport): Promise<void>;
export {};
