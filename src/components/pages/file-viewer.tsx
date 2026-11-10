"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PdfViewer } from "@/components/pages/pdf-viewer";
import { IFRAME_SANDBOX, type PageKind } from "@/lib/pages/rules";

export function FileViewer({ kind, url, downloadUrl, title }: { kind: PageKind; url: string; downloadUrl: string; title: string }) {
  const [actual, setActual] = useState(false);
  if (kind === "html") return <iframe title={title} src={url} sandbox={IFRAME_SANDBOX} allow="fullscreen; clipboard-write; autoplay" allowFullScreen className="block h-full w-full border-0" />;
  if (kind === "pdf") return <PdfViewer url={url} downloadUrl={downloadUrl} title={title} />;
  if (kind === "image") return <div className="h-full w-full overflow-auto bg-muted"><button key={String(actual)} type="button" aria-label={actual ? "Fit image to screen" : "View image at actual size"} aria-pressed={actual} onClick={() => setActual(!actual)} className={`pages-image-enter ${actual ? "block min-h-full min-w-full cursor-zoom-out" : "flex h-full w-full cursor-zoom-in items-center justify-center"}`}>
    {/* SVG stays in an img element so uploaded scripts cannot execute. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={title} className={actual ? "mx-auto block max-w-none" : "block max-h-full max-w-full object-contain"} />
  </button></div>;
  if (kind === "video") return <div className="flex h-full items-center justify-center bg-black"><video src={url} controls playsInline preload="metadata" aria-label={title} className="h-full w-full object-contain" /></div>;
  return null;
}

export function NikoFormPill() {
  const [closed, setClosed] = useState(false);
  return <div className={`pages-pill fixed right-3 bottom-3 z-20 flex items-center gap-1 rounded-full bg-white/95 py-1 pr-1 pl-3 text-xs font-medium text-neutral-900 shadow-lg ${closed ? "pages-pill-closed" : ""}`} inert={closed} aria-hidden={closed}>
    <a href="https://nikoform.co.ke" target="_blank" rel="noreferrer" className="py-1">NikoForm</a>
    <button type="button" onClick={() => setClosed(true)} aria-label="Hide NikoForm pill" className="grid size-7 place-items-center rounded-full hover:bg-neutral-100"><X className="size-3.5" /></button>
  </div>;
}
