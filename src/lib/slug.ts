import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SUFFIX_LEN = 4;

function randomSuffix(): string {
  const bytes = randomBytes(SUFFIX_LEN);
  let out = "";
  for (let i = 0; i < SUFFIX_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function withCollisionSuffix(base: string): string {
  return `${base || "event"}-${randomSuffix()}`;
}
