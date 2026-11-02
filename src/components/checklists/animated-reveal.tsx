"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep fields mounted through the exit, animating only opacity and transform. */
export function AnimatedReveal({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || (!open && element.hidden)) return;
    element.hidden = false;
    if (open) element.querySelector<HTMLElement>("[data-reveal-focus]")?.focus();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.hidden = !open;
      return;
    }
    const style = getComputedStyle(element);
    const duration = style.getPropertyValue("--cl-duration").trim();
    const frames = [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "translateY(0)" }];
    const animation = element.animate(open ? frames : [...frames].reverse(), {
      duration: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
      easing: style.getPropertyValue("--cl-ease").trim(),
    });
    void animation.finished.then(() => { element.hidden = !open; }, () => {});
    return () => animation.cancel();
  }, [open]);
  return <div ref={ref} hidden aria-hidden={!open} inert={!open}>{children}</div>;
}
