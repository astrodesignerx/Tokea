"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const watch = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") timer = setInterval(refresh, 15_000);
    };
    const onVisible = () => { watch(); refresh(); };
    watch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return null;
}
