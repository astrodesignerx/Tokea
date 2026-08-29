"use client";

import { useCallback, useRef, useState } from "react";
import { QrCode, RotateCcw, UserPlus } from "lucide-react";

/**
 * The hero's interactive 3D object: a business card that leans towards the
 * pointer and flips to its QR side when clicked.
 *
 * Built on CSS 3D transforms rather than WebGL. The whole effect is one
 * `perspective` and a `rotate3d` on a single element, which the compositor
 * handles without touching the main thread. A canvas renderer would cost a
 * few hundred kilobytes of JavaScript and a render loop to do less.
 *
 * The rotation is written to a custom property rather than to React state, so
 * pointer movement never triggers a re-render. State holds only the flip,
 * which is a real change in what the card shows.
 */

const MAX_TILT = 11; // degrees; past roughly 12 the text starts to smear

export function TiltCard({
  qrDataUrl,
  qrLabel,
}: {
  qrDataUrl: string;
  /** Host the QR encodes. Passed in rather than hardcoded so the two never disagree. */
  qrLabel: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = frame.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // -1 to 1 across each axis, measured from the centre.
    const px = (event.clientX - rect.left) / rect.width * 2 - 1;
    const py = (event.clientY - rect.top) / rect.height * 2 - 1;

    el.style.setProperty("--rx", `${(-py * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * MAX_TILT).toFixed(2)}deg`);
    // The glare tracks the pointer so the highlight reads as a light source.
    el.style.setProperty("--gx", `${((px + 1) / 2 * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((py + 1) / 2 * 100).toFixed(1)}%`);
  }, []);

  const reset = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <div className="tilt-scene">
      <div
        ref={frame}
        className="tilt-frame"
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
      >
        <div className={`tilt-card ${flipped ? "is-flipped" : ""}`}>
          <div className="tilt-face tilt-front">
            <div className="tilt-glare" aria-hidden="true" />
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand">
                  Karibu Health
                </span>
                <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
              </div>

              <div>
                <p className="font-display text-2xl leading-tight text-foreground">
                  Ada Kimani
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Programme Lead
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserPlus className="size-3.5 text-brand" />
                Save to contacts
              </div>
            </div>
          </div>

          <div className="tilt-face tilt-back">
            <div className="tilt-glare" aria-hidden="true" />
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${qrLabel}`}
                className="size-32 rounded-md"
              />
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                {qrLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="tilt-flip"
        aria-pressed={flipped}
      >
        {flipped ? <RotateCcw className="size-3.5" /> : <QrCode className="size-3.5" />}
        {flipped ? "Show the card" : "Show the QR code"}
      </button>
    </div>
  );
}
