"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const PNG_WIDTH = 2048;

/**
 * Print downloads. SVG and PDF come straight from the server. PNG is drawn
 * here from the server's SVG (which already has the logo embedded), because
 * the browser can turn SVG into pixels without any native server library.
 */
export function QrDownloads({ id, shortCode }: { id: string; shortCode: string }) {
  const [busy, setBusy] = useState(false);

  async function downloadPng() {
    setBusy(true);
    let objectUrl: string | null = null;
    try {
      const res = await fetch(`/api/qr/${id}?format=svg&size=${PNG_WIDTH}`, { cache: "no-store" });
      if (!res.ok || !res.headers.get("content-type")?.includes("svg")) throw new Error("svg");
      const svg = await res.text();
      objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

      const img = new Image();
      img.decoding = "async";
      img.src = objectUrl;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || PNG_WIDTH;
      canvas.height = img.naturalHeight || PNG_WIDTH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("png");

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `qr-${shortCode}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch {
      toast.error("Could not make the PNG. Download the SVG or PDF instead.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={downloadPng} disabled={busy}>
        <Download className="size-4" /> {busy ? "Making PNG..." : "PNG"}
      </Button>
      {(["svg", "pdf"] as const).map((format) => (
        <Button key={format} asChild variant="outline" size="sm">
          <a href={`/api/qr/${id}?format=${format}&size=2048`} download>
            <Download className="size-4" /> {format.toUpperCase()}
          </a>
        </Button>
      ))}
    </div>
  );
}
