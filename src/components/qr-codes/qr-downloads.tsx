"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { layoutQr, type QrDesign } from "@/lib/qr-codes/design";
import type { PdfLogo } from "@/lib/qr-codes/pdf";

const PNG_WIDTH = 2048;
/** 6 inches wide. The PDF is vector, so print software can scale it freely. */
const PDF_POINTS = 432;
/** Longest side for a logo turned into pixels for the PDF. */
const LOGO_PIXELS = 1200;

type Props = {
  id: string;
  shortCode: string;
  /** The permanent link the code encodes. */
  url: string;
  /** The saved design (downloads always use the saved version). */
  design: QrDesign;
};

function save(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

async function loadImage(blob: Blob): Promise<{ img: HTMLImageElement; release: () => void }> {
  const src = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  try {
    await img.decode();
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
  return { img, release: () => URL.revokeObjectURL(src) };
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png");
  return blob;
}

/**
 * The code's logo, ready for pdf-lib. PNG and JPEG pass straight through;
 * SVG, WebP and anything else the browser can show is drawn to a canvas and
 * saved as PNG, which is how SVG logos reach the PDF.
 */
async function logoForPdf(id: string): Promise<PdfLogo | null> {
  const res = await fetch(`/api/qr/${id}?format=logo`, { cache: "no-store" });
  if (!res.ok) return null;
  return toPdfLogo(await res.blob(), res.headers.get("content-type") ?? "");
}

export async function toPdfLogo(blob: Blob, type: string): Promise<PdfLogo> {
  if (type.startsWith("image/png")) return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "png" };
  if (type.startsWith("image/jpeg")) return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "jpg" };

  const typed = type.startsWith("image/") ? blob : new Blob([blob], { type: "image/svg+xml" });
  const { img, release } = await loadImage(typed);
  try {
    // SVGs without a width and height report 0; treat them as square.
    const w = img.naturalWidth || LOGO_PIXELS;
    const h = img.naturalHeight || LOGO_PIXELS;
    const fit = LOGO_PIXELS / Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * fit));
    canvas.height = Math.max(1, Math.round(h * fit));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await canvasToPng(canvas);
    return { bytes: new Uint8Array(await png.arrayBuffer()), kind: "png" };
  } finally {
    release();
  }
}

/**
 * Print downloads. SVG comes straight from the server. PNG and PDF are made
 * here, because the browser can turn SVG into pixels (for the PNG, and for
 * SVG logos inside the PDF) without any native server library.
 */
export function QrDownloads({ id, shortCode, url, design }: Props) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  async function downloadPng() {
    setBusy("png");
    try {
      const res = await fetch(`/api/qr/${id}?format=svg&size=${PNG_WIDTH}`, { cache: "no-store" });
      if (!res.ok || !res.headers.get("content-type")?.includes("svg")) throw new Error("svg");
      const { img, release } = await loadImage(new Blob([await res.text()], { type: "image/svg+xml" }));
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || PNG_WIDTH;
        canvas.height = img.naturalHeight || PNG_WIDTH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        save(await canvasToPng(canvas), `qr-${shortCode}.png`);
      } finally {
        release();
      }
    } catch {
      toast.error("Could not make the PNG. Download the SVG instead.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      let logo: PdfLogo | null = null;
      if (design.hasLogo) {
        try {
          logo = await logoForPdf(id);
        } catch {
          logo = null;
        }
        if (!logo) toast.warning("The logo could not be loaded, so this PDF has none.");
      }
      const { buildQrPdf } = await import("@/lib/qr-codes/pdf");
      const layout = layoutQr(url, { ...design, hasLogo: Boolean(logo) });
      const bytes = await buildQrPdf(layout, logo, PDF_POINTS);
      save(new Blob([bytes as BlobPart], { type: "application/pdf" }), `qr-${shortCode}.pdf`);
    } catch {
      toast.error("Could not make the PDF. Download the SVG instead.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={downloadPng} disabled={busy !== null}>
        <Download className="size-4" /> {busy === "png" ? "Making PNG..." : "PNG"}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/qr/${id}?format=svg&size=2048`} download>
          <Download className="size-4" /> SVG
        </a>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadPdf} disabled={busy !== null}>
        <Download className="size-4" /> {busy === "pdf" ? "Making PDF..." : "PDF"}
      </Button>
    </div>
  );
}
