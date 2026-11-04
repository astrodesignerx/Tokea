export function formatDocNumber(prefix: string, n: number): string {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError("Document numbers start at 1.");
  return `${prefix}${String(n).padStart(4, "0")}`;
}
