export type VendorLineRange = {
  slug: string;
  startLine: number;
  endLine: number;
};

export function extractVendorSlugs(source: string): string[];
export function extractVendorSourceUrls(source: string): Map<string, string[]>;
export function hasOnlyUnsupportedSources(
  vendorSlug: string,
  vendorSourceUrls: Map<string, string[]>,
  unsupportedSourceUrls: Set<string>,
): boolean;
export function getVendorLineRanges(source: string): VendorLineRange[];
export function filterVendorAffectingFiles(paths: string[]): string[];
export function getChangedVendorSlugs(options: {
  diffText: string;
  vendorSlugs: string[];
  vendorLineRanges?: VendorLineRange[];
}): string[];
