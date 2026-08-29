"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's interactive 2D layer: a grid of dots that lights up around the
 * pointer.
 *
 * Drawn on a canvas rather than as elements. A grid dense enough to read as
 * texture is several hundred dots, and animating that many DOM nodes would
 * cost far more than repainting one canvas.
 *
 * The loop only runs when it has something to do: it stops when the tab is
 * hidden, when the section scrolls out of view, and entirely under
 * prefers-reduced-motion, where a single static frame is drawn instead.
 */

const SPACING = 26;
const DOT = 1.1;
const RADIUS = 130; // pointer influence, in CSS pixels

export function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement ?? canvas;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const styles = getComputedStyle(canvas);
    const base = styles.getPropertyValue("--dot-base").trim() || "150 2% 34%";
    const lit = styles.getPropertyValue("--dot-lit").trim() || "153 60% 53%";

    let width = 0;
    let height = 0;
    let raf = 0;
    let onScreen = true;
    // Parked off-canvas so nothing is lit until the pointer actually arrives.
    let px = -9999;
    let py = -9999;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          const dist = Math.hypot(x - px, y - py);
          // 0 far away, 1 directly under the pointer.
          const t = dist > RADIUS ? 0 : 1 - dist / RADIUS;
          const eased = t * t;

          ctx.beginPath();
          ctx.arc(x, y, DOT + eased * 1.5, 0, Math.PI * 2);
          ctx.fillStyle =
            eased > 0.02
              ? `hsl(${lit} / ${(0.12 + eased * 0.75).toFixed(3)})`
              : `hsl(${base} / 0.5)`;
          ctx.fill();
        }
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (raf || reduced) return;
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onResize = () => {
      resize();
      draw();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      px = event.clientX - rect.left;
      py = event.clientY - rect.top;
    };

    const onPointerLeave = () => {
      px = -9999;
      py = -9999;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    };

    resize();
    draw();
    window.addEventListener("resize", onResize);

    if (reduced) {
      return () => window.removeEventListener("resize", onResize);
    }

    parent.addEventListener("pointermove", onPointerMove);
    parent.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="dot-field pointer-events-none absolute inset-0 size-full"
    />
  );
}
