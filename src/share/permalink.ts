import type { Language } from "../language";

export interface ShareState {
  language: Language;
  source: string;
}

/**
 * The largest pasted source a permalink will encode. Kept well under browser
 * and chat-app URL truncation limits (most clip somewhere past 2,000–8,000
 * characters) since the whole point of a permalink is that it survives being
 * pasted into Slack/email/etc. intact.
 */
export const MAX_SHARE_SOURCE_LENGTH = 6000;

export class ShareSourceTooLargeError extends Error {
  constructor(length: number) {
    super(
      `Pasted source is ${length.toLocaleString()} characters — the shareable link supports up ` +
        `to ${MAX_SHARE_SOURCE_LENGTH.toLocaleString()}.`,
    );
    this.name = "ShareSourceTooLargeError";
  }
}

/**
 * Encodes a paste and its language into a URL hash fragment. The hash (never
 * sent to a server, unlike a query string) keeps a shared link fully
 * client-side, matching the product's zero-backend design.
 */
export function encodeShareHash(state: ShareState): string {
  if (state.source.length > MAX_SHARE_SOURCE_LENGTH) {
    throw new ShareSourceTooLargeError(state.source.length);
  }
  const params = new URLSearchParams();
  params.set("lang", state.language);
  params.set("src", state.source);
  return `#${params.toString()}`;
}

function isLanguage(value: string | null): value is Language {
  return value === "javascript" || value === "python";
}

/**
 * Decodes a URL hash fragment back into a paste and its language. Returns
 * null for anything that isn't a well-formed share link (empty hash, missing
 * fields, an unrecognized language) rather than throwing, so a plain visit
 * with no fragment is a normal, silent no-op.
 */
export function decodeShareHash(hash: string): ShareState | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const source = params.get("src");
  const language = params.get("lang");
  if (source === null || !isLanguage(language)) return null;
  return { language, source };
}
