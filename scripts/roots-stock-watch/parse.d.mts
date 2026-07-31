// Hand-written declarations for parse.mjs.
//
// The watcher is plain ESM so it runs under bare `node` with no build step,
// but the unit tests are TypeScript (that's what vitest is configured to
// collect), and `npm run typecheck` covers the test directory. These
// declarations keep both true without turning on allowJs project-wide.

export const IN_STOCK: 'in_stock';
export const OUT_OF_STOCK: 'out_of_stock';
export const UNKNOWN: 'unknown';

export type SizeStatus = 'in_stock' | 'out_of_stock' | 'unknown';
export type Confidence = 'high' | 'low';

export interface SizeReading {
  value: string;
  label: string;
  status: SizeStatus;
}

export interface ParsedProductUrl {
  origin: string;
  pid: string | null;
  color: string | null;
  url: string;
}

export interface JsonLdSummary {
  name: string | null;
  price: string | number | null;
  currency: string | null;
  anyInStock: boolean | null;
}

export interface WantedSizeResult {
  wanted: string;
  matchedLabel: string | null;
  status: SizeStatus;
}

export function parseProductUrl(rawUrl: string): ParsedProductUrl;

export function discoverVariationEndpoint(html: string, origin: string): string | null;

export function buildVariationUrl(
  endpoint: string,
  params: { pid: string; color?: string | null; size?: string | null },
): string;

export function extractSizesFromVariationJson(
  payload: unknown,
): { sizes: SizeReading[]; productName: string | null; confidence: Confidence } | null;

export function extractSizesFromHtml(html: string): {
  sizes: SizeReading[];
  confidence: Confidence;
};

export function extractJsonLd(html: string): unknown[];

export function summarizeJsonLd(blocks: unknown[]): JsonLdSummary | null;

export function normalizeSize(size: string | number): string;

export function matchWantedSizes(sizes: SizeReading[], wanted: string[]): WantedSizeResult[];
