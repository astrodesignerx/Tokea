/** Keep invite sign-in returns on this site, including after URL normalisation. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\u0000-\u0020\u007f]/.test(value)) return "/dashboard";
  return value;
}
