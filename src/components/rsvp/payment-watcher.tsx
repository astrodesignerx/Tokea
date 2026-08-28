"use client";

import * as React from "react";

/**
 * Follows a pending payment until it resolves, then reloads the page.
 *
 * M-Pesa charges settle out of band — the prompt can sit on a phone long after
 * the guest is returned to this page. Each poll also nudges the server to
 * verify with Paystack, so a slow or blocked webhook does not strand anyone.
 */
export function PaymentWatcher({ reference }: { reference: string }) {
  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    // ~2 minutes, which is longer than an STK prompt stays open.
    const MAX_ATTEMPTS = 40;

    async function poll() {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      try {
        const res = await fetch(
          `/api/payments/status?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const { status } = (await res.json()) as { status: string };
          if (status === "success") {
            window.location.reload();
            return;
          }
        }
      } catch {
        // Offline or a blip — just try again.
      }
      if (!cancelled) window.setTimeout(poll, 3000);
    }

    const timer = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reference]);

  return null;
}
