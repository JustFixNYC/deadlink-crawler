import type { DeadlinkConfig, LinkReference, ValidationResult } from "./types.js";
export declare function mergeReferences(references: LinkReference[]): LinkReference[];
export declare function validateLinks(references: LinkReference[], config: DeadlinkConfig): Promise<ValidationResult[]>;
