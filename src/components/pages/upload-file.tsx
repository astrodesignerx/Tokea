"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT, fileKind, sizeProblem } from "@/lib/pages/rules";

async function metadata(body: object) {
  const response = await fetch("/api/pages/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.redirected) throw new Error("Your session expired. Sign in and try again.");
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? "Could not upload this file. Please try again.");
  return result;
}

export function UploadFile({ pageId, disabled = false }: { pageId?: string; disabled?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file || busy.current || disabled) return;
    setError("");
    const type = fileKind(file.name);
    const problem = type ? sizeProblem(type.kind, file.size) : "This file type is not supported yet.";
    if (problem) { setError(problem); return; }
    busy.current = true;
    setUploading(true);
    setProgress(0);
    setStatus("Preparing upload...");
    try {
      const prepared = await metadata({ operation: "prepare", name: file.name, size: file.size, ...(pageId ? { pageId } : {}) });
      setStatus(`Uploading ${file.name}`);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", prepared.url);
        Object.entries(prepared.headers as Record<string, string>).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        xhr.timeout = 10 * 60 * 1000;
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 95)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The file upload failed. Choose the file to try again."));
        xhr.onerror = () => reject(new Error("Could not reach file storage. Check your connection and try again."));
        xhr.ontimeout = () => reject(new Error("The upload timed out. Please try again."));
        xhr.onabort = () => reject(new Error("The upload was cancelled."));
        xhr.send(file);
      });
      setProgress(95);
      setStatus("Checking file...");
      const confirmed = await metadata({ operation: "confirm", pageId: prepared.pageId, fileId: prepared.fileId });
      setProgress(100);
      setStatus("File ready");
      if (!pageId) router.push(`/dashboard/pages/${confirmed.pageId}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload this file. Please try again.");
      setStatus("");
    } finally {
      busy.current = false;
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div>
    <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-label={pageId ? "Choose replacement file" : "Choose file to upload"} disabled={disabled || uploading} onChange={(event) => void upload(event.target.files?.[0])} />
    <div className={`${pageId ? "" : "pages-drop rounded-xl border border-dashed p-6 text-center"} ${over ? "pages-drop-over" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!disabled && !uploading) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(event) => { event.preventDefault(); setOver(false); void upload(event.dataTransfer.files[0]); }} aria-busy={uploading}>
      {!pageId && <><Upload className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" /><p className="text-sm font-medium">Drop a file here</p><p className="mt-1 mb-4 text-xs text-muted-foreground">HTML, PDF, images, video or Office. Video up to 200 MB, PDF and Office up to 50 MB, others up to 20 MB.</p></>}
      <Button type="button" variant={pageId ? "outline" : "default"} disabled={disabled || uploading} onClick={() => input.current?.click()}><Upload className="size-4" />{uploading ? "Uploading..." : pageId ? "Replace file" : "Upload file"}</Button>
      {pageId && <p className="mt-2 text-xs text-muted-foreground">Replacing the file keeps the same link and QR code.</p>}
      {status && <div className="pages-enter mt-4 min-w-0" role="status"><p className="truncate text-xs text-muted-foreground">{status}</p><div role="progressbar" aria-label="File upload" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="pages-progress h-full origin-left bg-primary" style={{ transform: `scaleX(${progress / 100})` }} /></div></div>}
    </div>
    {error && <p role="alert" className="pages-enter mt-3 text-sm text-destructive">{error}</p>}
  </div>;
}
