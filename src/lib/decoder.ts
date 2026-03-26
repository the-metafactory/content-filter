import type { EncodingMatch } from "./types";

/**
 * Decoded content with provenance metadata.
 */
export interface DecodedContent {
  /** Original encoded text that was decoded */
  original: string;
  /** Decoded plain text result */
  decoded: string;
  /** Encoding type (base64, unicode, hex, url_encoded, html_entity) */
  type: string;
  /** Line number where original encoding was found */
  line: number;
  /** Column number where original encoding was found */
  column: number;
}

/**
 * Filter non-printable characters from decoded text.
 * Keeps ASCII printable (0x20-0x7E) plus common whitespace (newline, CR, tab).
 */
function filterNonPrintable(text: string): string {
  return text.replace(/[^\x20-\x7E\n\r\t]/g, "");
}

/**
 * Decode a base64-encoded string to plain text.
 *
 * Uses Node.js Buffer.from() for safe, well-tested decoding.
 * Returns empty string on malformed input or decode errors.
 *
 * Handles both standard base64 (with padding) and base64url variant.
 */
export function decodeBase64(text: string): string {
  try {
    // Remove whitespace and validate base64 alphabet
    const cleaned = text.trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+\/=_-]+$/.test(cleaned)) {
      return "";
    }

    // Normalize base64url to standard base64
    const normalized = cleaned.replace(/-/g, "+").replace(/_/g, "/");

    // Decode using Buffer
    const buffer = Buffer.from(normalized, "base64");
    const decoded = buffer.toString("utf-8");

    // Filter non-printable characters (keep only ASCII printable + common whitespace)
    return filterNonPrintable(decoded);
  } catch {
    return "";
  }
}

/**
 * Decode unicode escape sequences (\uNNNN and \xNN) to plain text.
 *
 * Handles both \uNNNN (16-bit) and \xNN (8-bit) escape sequences.
 * Returns empty string on decode errors.
 */
export function decodeUnicode(text: string): string {
  try {
    // Replace \uNNNN sequences
    let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return String.fromCharCode(code);
    });

    // Replace \xNN sequences
    decoded = decoded.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return String.fromCharCode(code);
    });

    // Filter non-printable characters
    return filterNonPrintable(decoded);
  } catch {
    return "";
  }
}

/**
 * Decode hex byte sequences (0xNN 0xNN ...) to plain text.
 *
 * Parses space-separated hex bytes like "0x48 0x65 0x6c 0x6c 0x6f".
 * Returns empty string on decode errors.
 */
export function decodeHex(text: string): string {
  try {
    // Extract all 0xNN patterns
    const hexBytes = text.match(/0x[0-9a-fA-F]{2}/g);
    if (!hexBytes || hexBytes.length === 0) {
      return "";
    }

    // Convert each hex byte to character
    const chars = hexBytes.map((hex) => {
      const code = parseInt(hex.slice(2), 16);
      return String.fromCharCode(code);
    });

    const decoded = chars.join("");

    // Filter non-printable characters
    return filterNonPrintable(decoded);
  } catch {
    return "";
  }
}

/**
 * Decode URL-encoded strings (%NN %NN ...) to plain text.
 *
 * Uses built-in decodeURIComponent for safe decoding.
 * Returns empty string on decode errors.
 */
export function decodeUrlEncoded(text: string): string {
  try {
    const decoded = decodeURIComponent(text);

    // Filter non-printable characters
    return filterNonPrintable(decoded);
  } catch {
    return "";
  }
}

/**
 * Decode HTML numeric entities (&#NNN; and &#xNNN;) to plain text.
 *
 * Handles both decimal (&#65;) and hexadecimal (&#x41;) numeric entities.
 * Does NOT handle named entities like &lt; &gt; (out of scope).
 * Returns empty string on decode errors.
 */
export function decodeHtmlEntity(text: string): string {
  try {
    // Replace &#xNNNN; (hexadecimal entities)
    let decoded = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return String.fromCharCode(code);
    });

    // Replace &#NNNN; (decimal entities)
    decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return String.fromCharCode(code);
    });

    // Filter non-printable characters
    return filterNonPrintable(decoded);
  } catch {
    return "";
  }
}

/**
 * Decode an array of EncodingMatch objects to plain text.
 *
 * Routes each match to the appropriate decoder based on type.
 * Returns array of decoded content with provenance metadata.
 *
 * Filters out empty decoded results (from malformed input or binary garbage).
 */
export function decodeEncodedMatches(
  matches: EncodingMatch[]
): DecodedContent[] {
  const results: DecodedContent[] = [];

  for (const match of matches) {
    // Use full_text for decoding if available, otherwise fall back to matched_text
    const textToDecode = match.full_text ?? match.matched_text;
    let decoded = "";

    switch (match.type) {
      case "base64":
        decoded = decodeBase64(textToDecode);
        break;
      case "unicode":
        decoded = decodeUnicode(textToDecode);
        break;
      case "hex":
        decoded = decodeHex(textToDecode);
        break;
      case "url_encoded":
        decoded = decodeUrlEncoded(textToDecode);
        break;
      case "html_entity":
        decoded = decodeHtmlEntity(textToDecode);
        break;
      default:
        // Unknown encoding type (e.g., multi_file_split) — no decoder
        continue;
    }

    // Skip empty results (malformed input or binary garbage)
    if (decoded.trim().length === 0) {
      continue;
    }

    results.push({
      original: match.matched_text, // Use display version for reporting
      decoded,
      type: match.type,
      line: match.line,
      column: match.column,
    });
  }

  return results;
}
