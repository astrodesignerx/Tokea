export type PageKind = "html" | "pdf" | "image" | "video" | "office";

const TYPES: Record<string, { kind: PageKind; mime: string }> = {
  html: { kind: "html", mime: "text/html; charset=utf-8" },
  htm: { kind: "html", mime: "text/html; charset=utf-8" },
  pdf: { kind: "pdf", mime: "application/pdf" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
  gif: { kind: "image", mime: "image/gif" },
  avif: { kind: "image", mime: "image/avif" },
  svg: { kind: "image", mime: "image/svg+xml" },
  mp4: { kind: "video", mime: "video/mp4" },
  webm: { kind: "video", mime: "video/webm" },
  docx: { kind: "office", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  pptx: { kind: "office", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  xlsx: { kind: "office", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  doc: { kind: "office", mime: "application/msword" },
  ppt: { kind: "office", mime: "application/vnd.ms-powerpoint" },
  xls: { kind: "office", mime: "application/vnd.ms-excel" },
};

export const MB = 1024 * 1024;
export const MAX_PAGES = 50;
export const MAX_BYTES = 1024 * MB;
export const LIMITS: Record<PageKind, number> = { html: 20 * MB, pdf: 50 * MB, image: 20 * MB, video: 200 * MB, office: 50 * MB };
export const ACCEPT = Object.keys(TYPES).map((ext) => `.${ext}`).join(",");
export const IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-presentation";

export function fileKind(name: string): { kind: PageKind; mime: string } | null {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase();
  return extension && Object.hasOwn(TYPES, extension) ? TYPES[extension] : null;
}

export function sizeProblem(kind: PageKind, size: number): string | null {
  if (!Number.isSafeInteger(size) || size <= 0) return "Choose a file that is not empty.";
  return size > LIMITS[kind] ? `This file is too large. The limit is ${LIMITS[kind] / MB} MB.` : null;
}

// count is the existing page count; replacements pass count minus one.
export function quotaProblem(count: number, totalBytes: number, newSize: number): string | null {
  if (count >= MAX_PAGES) return "Your account can have up to 50 pages. Delete a page to upload another.";
  if (totalBytes + newSize > MAX_BYTES) return "Your account has a 1 GB file limit. Delete or replace a file to make room.";
  return null;
}

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent?.trim() || /bot|crawl|spider|preview|facebookexternalhit|WhatsApp|TelegramBot|Slackbot|Discordbot|LinkedInBot|Twitterbot|SkypeUriPreview/i.test(userAgent);
}

export function fileSize(size: number): string {
  return size < MB ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / MB).toFixed(1)} MB`;
}
