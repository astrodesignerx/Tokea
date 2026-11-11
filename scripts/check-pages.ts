import assert from "node:assert/strict";
import { ACCEPT, fileKind, IFRAME_SANDBOX, isBot, LIMITS, MAX_BYTES, quotaProblem, sizeProblem, type PageKind } from "../src/lib/pages/rules";

const extensions: [string, PageKind, string][] = [
  ["html", "html", "text/html; charset=utf-8"], ["htm", "html", "text/html; charset=utf-8"],
  ["pdf", "pdf", "application/pdf"], ["png", "image", "image/png"], ["jpg", "image", "image/jpeg"],
  ["jpeg", "image", "image/jpeg"], ["webp", "image", "image/webp"], ["gif", "image", "image/gif"],
  ["avif", "image", "image/avif"], ["svg", "image", "image/svg+xml"],
  ["mp4", "video", "video/mp4"], ["webm", "video", "video/webm"],
  ["docx", "office", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["pptx", "office", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["xlsx", "office", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["doc", "office", "application/msword"], ["ppt", "office", "application/vnd.ms-powerpoint"], ["xls", "office", "application/vnd.ms-excel"],
];
for (const [ext, kind, mime] of extensions) {
  assert.deepEqual(fileKind(`my.file.${ext}`), { kind, mime });
  assert.deepEqual(fileKind(`FILE.${ext.toUpperCase()}`), { kind, mime });
  assert.ok(ACCEPT.split(",").includes(`.${ext}`));
}
for (const name of ["file.exe", "no-extension", "image.svg.exe", "file.", "", "file.html ", "toString", "file.constructor"]) assert.equal(fileKind(name), null);
for (const kind of Object.keys(LIMITS) as PageKind[]) {
  assert.equal(sizeProblem(kind, 1), null);
  assert.equal(sizeProblem(kind, LIMITS[kind]), null);
  assert.ok(sizeProblem(kind, LIMITS[kind] + 1));
  for (const size of [0, -1, 1.5, NaN, Infinity]) assert.ok(sizeProblem(kind, size));
}
assert.equal(quotaProblem(49, MAX_BYTES - 1, 1), null);
assert.ok(quotaProblem(50, 0, 1));
assert.ok(quotaProblem(51, 0, 1));
assert.ok(quotaProblem(1, MAX_BYTES, 1));
assert.equal(quotaProblem(0, 0, MAX_BYTES), null);
for (const ua of [null, undefined, "", "  ", "Googlebot", "crawler", "SPIDER", "preview", "facebookexternalhit", "WhatsApp", "TelegramBot", "Slackbot", "Discordbot", "LinkedInBot", "Twitterbot", "SkypeUriPreview"]) assert.equal(isBot(ua), true);
for (const ua of ["Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1", "Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile Safari/537.36"]) assert.equal(isBot(ua), false);
assert.ok(!IFRAME_SANDBOX.includes("allow-same-origin"));
assert.ok(!IFRAME_SANDBOX.includes("allow-top-navigation"));
assert.deepEqual(IFRAME_SANDBOX.split(" "), ["allow-scripts", "allow-forms", "allow-popups", "allow-popups-to-escape-sandbox", "allow-modals", "allow-downloads", "allow-pointer-lock", "allow-presentation"]);
console.log("Pages checks passed: all extensions and MIME types, size and quota edges, bots and sandbox permissions.");
