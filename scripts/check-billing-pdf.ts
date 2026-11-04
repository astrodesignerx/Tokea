import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { buildPdfDocument, pdfDate, resolvePdfTemplate } from "../src/lib/billing/pdf/model";
import { loadBillingLogo } from "../src/lib/billing/pdf/logo";
import { PDF_TEMPLATES, sampleModel, sampleProfile, sampleRows } from "./lib/billing-pdf-samples";

async function checkLogoLimits() {
  for (const source of [null, "http://example.com/logo.png", "data:image/png;base64,AA==", "//example.com/logo.png", "/../package.json", "/%2e%2e/package.json", "/brand/missing.png", "/file.svg", "/brand/..%5c..%5cpackage.json"]) {
    assert.equal(await loadBillingLogo(source), null, `Rejected logo ${source}`);
  }
  const png = await readFile("public/brand/energy4impact.png");
  assert.match((await loadBillingLogo("/brand/energy4impact.png"))!, /^data:image\/png;base64,/);
  const originalFetch = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (_input, init) => {
      calls++;
      assert.equal(init?.redirect, "manual");
      assert(init?.signal instanceof AbortSignal);
      return new Response(png, { headers: { "Content-Type": "image/png" } });
    };
    assert.match((await loadBillingLogo("https://example.com/logo.png"))!, /^data:image\/png;base64,/);
    assert.equal(calls, 1);
    for (const mime of ["image/svg+xml", "image/webp", "text/html"]) {
      globalThis.fetch = async () => new Response(png, { headers: { "Content-Type": mime } });
      assert.equal(await loadBillingLogo("https://example.com/logo"), null);
    }
    globalThis.fetch = async () => new Response("invalid", { headers: { "Content-Type": "image/png" } });
    assert.equal(await loadBillingLogo("https://example.com/logo"), null);
    globalThis.fetch = async () => new Response(null, { headers: { "Content-Type": "image/png", "Content-Length": String(2 * 1024 * 1024 + 1) } });
    assert.equal(await loadBillingLogo("https://example.com/large"), null);
    let cancelled = false;
    globalThis.fetch = async () => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
      cancel() { cancelled = true; },
    }), { headers: { "Content-Type": "image/png" } });
    assert.equal(await loadBillingLogo("https://example.com/stream"), null);
    assert(cancelled, "Oversized stream was cancelled");
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { Location: "http://example.com/insecure" } }); };
    assert.equal(await loadBillingLogo("https://example.com/redirect"), null);
    assert.equal(calls, 1, "Insecure redirect was not fetched");
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { Location: "/loop" } }); };
    assert.equal(await loadBillingLogo("https://example.com/loop"), null);
    assert.equal(calls, 4, "Redirects are bounded");
    globalThis.fetch = async () => { throw new Error("Offline fixture"); };
    assert.equal(await loadBillingLogo("https://example.com/error"), null);
    globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("Timed out")), { once: true });
    });
    // Keep Node alive while its unreferenced AbortSignal timeout expires.
    const keepAlive = setInterval(() => {}, 1000);
    const started = Date.now();
    try {
      assert.equal(await loadBillingLogo("https://example.com/timeout"), null);
      assert(Date.now() - started < 6500, "Logo timeout must stop a stalled fetch");
    } finally { clearInterval(keepAlive); }
  } finally { globalThis.fetch = originalFetch; }
}

async function main() {
  const { renderBillingPdf } = await import("../src/lib/billing/pdf/render");
  const { contrastText } = await import("../src/lib/billing/pdf/templates/parts");
  await checkLogoLimits();
  assert.equal(pdfDate(new Date("2026-10-29T22:30:00Z")), "Oct 30, 2026");
  assert.equal(resolvePdfTemplate("astro", null), "classic");
  assert.equal(resolvePdfTemplate("unknown", "astro"), "classic");
  assert.equal(contrastText("#f7ad19"), "#111111");
  assert.equal(contrastText("#173c48"), "#ffffff");
  const quote = await sampleModel("quote", "classic");
  assert.equal(quote.validityDays, 14);
  assert.deepEqual(quote.sections.map((section) => section.title), ["DESIGN", "PRINTING"]);
  assert.equal(quote.sections[0].items[1].quantity, "1.5");
  assert.equal(quote.sections[0].items[0].unitPrice, "KES 3,500.00");
  const receipt = await sampleModel("receipt", "astro");
  assert.equal(receipt.invoice?.status, "Part paid");
  assert.equal(receipt.invoice?.number, "INV-0001");
  assert.equal(receipt.paidDate, "Oct 30, 2026");
  const orphan = await buildPdfDocument({ ...sampleRows("receipt", "classic"), invoice: null }, null);
  assert.equal(orphan.invoice, null);
  assert.equal(orphan.bank, null);
  assert.equal(orphan.mpesa, null);
  const profile = sampleProfile();
  profile.private_template = null;
  assert.equal((await buildPdfDocument(sampleRows("quote", "astro"), profile)).template, "classic");

  for (const template of PDF_TEMPLATES) {
    const buffer = await renderBillingPdf(await sampleModel("quote", template));
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
    assert(buffer.length < 1024 * 1024, `${template} PDF must be under 1 MB`);
    assert.equal((await PDFDocument.load(buffer)).getPageCount(), (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length);
    const longBuffer = await renderBillingPdf(await sampleModel("invoice-long", template));
    const pages = (longBuffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
    assert(pages >= 2, `${template} long invoice must paginate`);
    assert(longBuffer.length < 1024 * 1024, `${template} long PDF must be under 1 MB`);
    console.log(`${template}: PDF signature OK, ${buffer.length} bytes; 25-item invoice ${pages} pages, ${longBuffer.length} bytes`);
  }
  // The renderer also checks entitlement for callers that construct models directly.
  const denied = await renderBillingPdf({ ...quote, template: "astro", privateTemplate: null });
  const classic = await renderBillingPdf(quote);
  assert.equal((await PDFDocument.load(denied)).getPageCount(), (await PDFDocument.load(classic)).getPageCount());
  const serif = await renderBillingPdf({ ...quote, brand: { ...quote.brand, fontFamily: "Young Serif" } });
  assert.equal(serif.subarray(0, 5).toString(), "%PDF-");
  console.log("Billing PDF checks passed: templates, pagination, models, private-template guard and logo limits.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
