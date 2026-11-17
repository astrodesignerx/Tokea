"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, Upload, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { removeProfilePhoto, updateProfilePhoto } from "@/lib/actions/profile";
import { getInitials, type ProfileUser } from "@/components/profile/avatar";
import { useModalDialog } from "@/components/profile/use-modal-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEW_SIZE = 240;
const EXPORT_SIZE = 512;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type LoadedSource = {
  url: string;
  width: number;
  height: number;
};

type Offset = { x: number; y: number };

function clampOffset(
  offset: Offset,
  source: LoadedSource,
  zoom: number,
): Offset {
  const baseScale = Math.max(VIEW_SIZE / source.width, VIEW_SIZE / source.height);
  const scale = baseScale * zoom;
  const renderedW = source.width * scale;
  const renderedH = source.height * scale;
  const maxX = Math.max(0, (renderedW - VIEW_SIZE) / 2);
  const maxY = Math.max(0, (renderedH - VIEW_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

function humanUploadError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("large") || lower.includes("2mb")) {
    return "That image is too big. Choose a photo under 2 MB.";
  }
  if (lower.includes("unsupported") || lower.includes("type")) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  if (lower.includes("unauthorized")) {
    return "Your session expired. Sign in again to upload a photo.";
  }
  return "Upload failed. Please try again.";
}

export function AvatarEditor({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageElRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const { rendered, shown, openDialog, closeDialog, panelRef } =
    useModalDialog(triggerRef);

  const [source, setSource] = useState<LoadedSource | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, startRemoving] = useTransition();

  // Local display state so switching between photo and initials crossfades cleanly.
  const [optimisticImage, setOptimisticImage] = useState<string | null | undefined>(
    undefined,
  );
  const [photoVisible, setPhotoVisible] = useState(Boolean(user.image));
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(user.image);

  const effectiveImage =
    optimisticImage !== undefined ? optimisticImage : user.image;
  const displayImage = effectiveImage ?? lastImageUrl;
  const initials = getInitials(user);

  const revokeSource = useCallback((target: LoadedSource | null) => {
    if (target) URL.revokeObjectURL(target.url);
  }, []);

  useEffect(() => {
    return () => {
      revokeSource(source);
    };
  }, [source, revokeSource]);

  function resetDraft() {
    setSource((prev) => {
      revokeSource(prev);
      return null;
    });
    imageElRef.current = null;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpen() {
    resetDraft();
    openDialog();
  }

  function handleClose() {
    if (saving || removing) return;
    closeDialog();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That file is too big. Choose an image under 10 MB.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        URL.revokeObjectURL(objectUrl);
        setError("Could not read that image. Try another file.");
        return;
      }
      imageElRef.current = img;
      setSource((prev) => {
        revokeSource(prev);
        return {
          url: objectUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("Could not open that image. Choose a different JPEG, PNG, or WebP file.");
    };
    img.src = objectUrl;
  }

  function handleZoomChange(nextZoom: number) {
    setZoom(nextZoom);
    if (source) {
      setOffset((prev) => clampOffset(prev, source, nextZoom));
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!source || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId || !source) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    setOffset(
      clampOffset(
        { x: active.originX + dx, y: active.originY + dy },
        source,
        zoom,
      ),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function handleCropKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!source || saving) return;
    const step = 8;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;

    event.preventDefault();
    setOffset((prev) => clampOffset({ x: prev.x + dx, y: prev.y + dy }, source, zoom));
  }

  async function handleSave() {
    if (!source || !imageElRef.current || saving) return;
    setError(null);
    setSaving(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Your browser could not crop the image.");
        setSaving(false);
        return;
      }

      const baseScale = Math.max(VIEW_SIZE / source.width, VIEW_SIZE / source.height);
      const scale = baseScale * zoom;
      const renderedW = source.width * scale;
      const renderedH = source.height * scale;
      const imgLeft = VIEW_SIZE / 2 + offset.x - renderedW / 2;
      const imgTop = VIEW_SIZE / 2 + offset.y - renderedH / 2;
      const ratio = EXPORT_SIZE / VIEW_SIZE;

      ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      ctx.drawImage(
        imageElRef.current,
        imgLeft * ratio,
        imgTop * ratio,
        renderedW * ratio,
        renderedH * ratio,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((out) => resolve(out), "image/webp", 0.88),
      );
      if (!blob) {
        setError("Could not process that image. Try a different photo.");
        setSaving(false);
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError("That cropped photo is over 2 MB. Choose a smaller image.");
        setSaving(false);
        return;
      }

      const presignRes = await fetch("/api/uploads/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "image/webp",
          contentLength: blob.size,
        }),
      });
      const presignJson = (await presignRes.json().catch(() => ({}))) as {
        uploadUrl?: string;
        publicUrl?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!presignRes.ok || !presignJson.uploadUrl || !presignJson.publicUrl) {
        setError(humanUploadError(presignJson.error ?? "presign-failed"));
        setSaving(false);
        return;
      }

      const putRes = await fetch(presignJson.uploadUrl, {
        method: "PUT",
        headers: presignJson.headers ?? { "Content-Type": "image/webp" },
        body: blob,
      });
      if (!putRes.ok) {
        setError("Upload failed. Check your connection and try again.");
        setSaving(false);
        return;
      }

      const saved = await updateProfilePhoto(presignJson.publicUrl);
      if (saved.error) {
        setError(saved.error);
        setSaving(false);
        return;
      }

      setLastImageUrl(presignJson.publicUrl);
      setOptimisticImage(presignJson.publicUrl);
      setPhotoVisible(true);
      toast.success("Photo updated");
      setSaving(false);
      closeDialog();
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
      setSaving(false);
    }
  }

  function handleRemove() {
    if (saving || removing) return;
    setError(null);
    startRemoving(async () => {
      const result = await removeProfilePhoto();
      if (result.error) {
        setError(result.error);
        return;
      }
      setPhotoVisible(false);
      setOptimisticImage(null);
      toast.success("Photo removed");
      closeDialog();
      router.refresh();
    });
  }

  const baseScale = source
    ? Math.max(VIEW_SIZE / source.width, VIEW_SIZE / source.height)
    : 1;
  const renderedW = source ? source.width * baseScale * zoom : 0;
  const renderedH = source ? source.height * baseScale * zoom : 0;

  return (
    <>
      <div className="relative inline-block shrink-0">
        <span
          role="img"
          aria-label={user.name?.trim() || user.email}
          className="relative inline-flex size-24 items-center justify-center overflow-hidden rounded-full bg-brand/15 font-display text-3xl font-medium text-brand ring-4 ring-background"
        >
          <span aria-hidden="true">{initials}</span>
          {displayImage ? (
            <Image
              src={displayImage}
              alt=""
              width={96}
              height={96}
              unoptimized
              onLoad={() => {
                if (effectiveImage) setPhotoVisible(true);
              }}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-(--fast) ease-(--ease) motion-reduce:transition-none",
                effectiveImage && photoVisible ? "opacity-100" : "opacity-0",
              )}
            />
          ) : null}
        </span>

        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-transform duration-(--fast) ease-(--ease) hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>
      </div>

      {rendered ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            data-open={shown ? "true" : "false"}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 opacity-0 transition-opacity duration-[220ms] ease-(--ease) data-[open=true]:opacity-100 motion-reduce:transition-none"
          />

          <div
            ref={panelRef}
            tabIndex={-1}
            data-open={shown ? "true" : "false"}
            className="relative z-10 w-full max-w-[calc(100vw-2rem)] translate-y-2 rounded-panel border bg-card p-5 opacity-0 shadow-lg transition-[opacity,transform] duration-[220ms] ease-(--ease) data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none sm:max-w-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="avatar-editor-title"
                  className="font-display text-lg font-medium tracking-tight"
                >
                  Profile photo
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, or WebP up to 2 MB after cropping.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={saving || removing}
                aria-label="Close photo dialog"
              >
                <X className="size-4" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />

            <div className="mt-5 flex flex-col items-center">
              {source ? (
                <>
                  <div
                    role="application"
                    tabIndex={0}
                    aria-label="Crop preview. Drag or use arrow keys to position your photo."
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onKeyDown={handleCropKeyDown}
                    style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
                    className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={source.url}
                      alt="Crop preview"
                      draggable={false}
                      style={{
                        width: renderedW,
                        height: renderedH,
                        maxWidth: "none",
                        transform: `translate3d(${VIEW_SIZE / 2 + offset.x - renderedW / 2}px, ${VIEW_SIZE / 2 + offset.y - renderedH / 2}px, 0)`,
                      }}
                      className="pointer-events-none absolute left-0 top-0 select-none"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80"
                    />
                  </div>

                  <p className="mt-2.5 text-xs text-muted-foreground">
                    Drag to reposition
                  </p>

                  <div className="mt-4 flex w-full max-w-[240px] items-center gap-3">
                    <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => handleZoomChange(Number(e.target.value))}
                      aria-label="Zoom photo"
                      disabled={saving}
                      className="h-2 w-full cursor-pointer accent-brand"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <span className="relative inline-flex size-24 items-center justify-center overflow-hidden rounded-full bg-brand/15 font-display text-3xl font-medium text-brand">
                    <span aria-hidden="true">{initials}</span>
                    {effectiveImage ? (
                      <Image
                        src={effectiveImage}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={removing}
                  >
                    <Upload className="size-4" /> Choose photo
                  </Button>
                </div>
              )}
            </div>

            {error ? (
              <p role="alert" className="qr-fade mt-4 text-center text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {source ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    Choose another
                  </Button>
                ) : null}
                {effectiveImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={saving || removing}
                    className="text-destructive hover:text-destructive"
                  >
                    {removing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Remove photo
                  </Button>
                ) : null}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={saving || removing}
                >
                  Cancel
                </Button>
                {source ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save photo"
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
