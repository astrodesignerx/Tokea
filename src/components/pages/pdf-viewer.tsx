"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PdfViewer({ url, downloadUrl, title }: { url: string; downloadUrl: string; title: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(1 / Math.SQRT2);
  const [current, setCurrent] = useState(1);
  const stack = useRef<HTMLDivElement>(null);
  const visible = useCallback((page: number) => setCurrent(page), []);

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    async function load() {
      const pdfjs = await import("pdfjs-dist");
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const assets = `/pages-pdf/${pdfjs.version}`;
      task = pdfjs.getDocument({ url, enableXfa: false, cMapUrl: `${assets}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}/standard_fonts/`, wasmUrl: `${assets}/wasm/` });
      const pdf = await task.promise;
      const first = await pdf.getPage(1);
      const viewport = first.getViewport({ scale: 1 });
      if (active) { setRatio(viewport.width / viewport.height); setDocument(pdf); }
    }
    void load().catch(() => { if (active) setError(true); });
    return () => { active = false; void task?.destroy().catch(() => {}); };
  }, [url]);

  useEffect(() => {
    const element = stack.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="flex h-full min-w-0 flex-col bg-muted">
    <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-3 py-2 sm:px-5">
      <span role="status" className="text-xs tabular-nums text-muted-foreground">{document ? `Page ${current} of ${document.numPages}` : error ? "PDF unavailable" : "Loading PDF..."}</span>
      <Button asChild variant="outline" size="sm"><a href={downloadUrl}><Download className="size-4" />Download</a></Button>
    </div>
    <div data-pdf-scroll className="min-h-0 flex-1 overflow-auto overscroll-contain" aria-label={title}>
      <div ref={stack} className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        {error && <p role="alert" className="rounded-lg border bg-card p-5 text-sm">Could not open this PDF. Download it to view it on your device, or reload the link to try again.</p>}
        {document && width > 0 && Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index + 1} document={document} number={index + 1} width={width} initialRatio={ratio} onVisible={visible} />)}
      </div>
    </div>
  </div>;
}

function PdfPage({ document, number, width, initialRatio, onVisible }: { document: PDFDocumentProxy; number: number; width: number; initialRatio: number; onVisible: (number: number) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [ratio, setRatio] = useState(initialRatio);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const root = element.closest("[data-pdf-scroll]");
    const nearby = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root, rootMargin: "800px 0px" });
    const current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onVisible(number); }, { root, rootMargin: "-5% 0px -75% 0px" });
    nearby.observe(element);
    current.observe(element);
    return () => { nearby.disconnect(); current.disconnect(); };
  }, [number, onVisible]);

  useEffect(() => {
    if (!near || !canvas.current) return;
    const element = canvas.current;
    let active = true;
    let task: RenderTask | undefined;
    async function render() {
      const page = await document.getPage(number);
      if (!active) return;
      setRendered(false);
      setFailed(false);
      const natural = page.getViewport({ scale: 1 });
      setRatio(natural.width / natural.height);
      const viewport = page.getViewport({ scale: width / natural.width });
      // Bound canvas dimensions and memory for Safari while retaining phone pixel density.
      const density = Math.min(window.devicePixelRatio || 1, 3, 4096 / viewport.width, 4096 / viewport.height, Math.sqrt(16000000 / (viewport.width * viewport.height)));
      element.width = Math.max(1, Math.floor(viewport.width * density));
      element.height = Math.max(1, Math.floor(viewport.height * density));
      task = page.render({ canvas: element, viewport, transform: density === 1 ? undefined : [density, 0, 0, density, 0, 0], background: "#ffffff" });
      await task.promise;
      if (active) setRendered(true);
    }
    void render().catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      task?.cancel();
      // Offscreen canvases otherwise keep tens of megabytes per page on phones.
      element.width = 0;
      element.height = 0;
    };
  }, [document, near, number, width]);

  return <div ref={frame} className="relative w-full overflow-hidden bg-white shadow-sm" style={{ aspectRatio: ratio }}>
    <canvas ref={canvas} role="img" aria-label={`PDF page ${number}`} className={`pages-pdf-canvas h-full w-full ${rendered && near ? "opacity-100" : "opacity-0"}`} />
    {(!rendered || !near || failed) && <p className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-neutral-600">{failed ? `Page ${number} could not render. Use Download to open the file.` : `Page ${number}`}</p>}
  </div>;
}
