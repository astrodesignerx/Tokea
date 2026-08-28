import { randomBytes } from "node:crypto";

/**
 * Alphabet with the ambiguous glyphs removed (0/O, 1/l/I), so a code read off
 * a printed card by eye cannot be mistyped into someone else's card.
 */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_LENGTH = 8;

/**
 * 31^8 is about 850 billion, so collisions are vanishingly unlikely, but the
 * caller must still check: a collision would silently point a printed QR code
 * at the wrong person, which is the one failure this system must not have.
 */
export function generateShortCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function normaliseShortCode(input: string): string {
  return input.trim().toLowerCase();
}
