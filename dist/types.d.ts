export type DeadlinkConfig = {
    siteUrl: string;
    locales: string[];
    publicRoutes: string[];
    sourceGlobs: string[];
    skipPatterns: string[];
    dynamicUrlSamples?: Record<string, string>;
};
export type LinkReference = {
    url: string;
    source?: string;
    line?: number;
    parentPage?: string;
    origin: "source" | "live";
};
export type ValidationResult = {
    url: string;
    ok: boolean;
    status: number;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
    references: LinkReference[];
};
export type DeadlinkReport = {
    scannedAt: string;
    configPath: string;
    workspace: string;
    sourceLinkCount: number;
    liveLinkCount: number;
    uniqueUrlCount: number;
    brokenCount: number;
    skippedCount: number;
    results: ValidationResult[];
};
