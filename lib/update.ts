"use client";

import { useEffect, useRef } from "react";

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

// Uygulama açıkken yeni sürüm yayınlandıysa haber ver (yalnızca bir kez)
export function useUpdateCheck(onUpdate: () => void) {
  const handler = useRef(onUpdate);
  handler.current = onUpdate;

  useEffect(() => {
    if (BUILD_ID === "dev") return; // geliştirme derlemelerinde kapalı
    let fired = false;
    let lastCheck = 0;

    const check = async () => {
      if (fired || !navigator.onLine || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { build } = (await res.json()) as { build?: string };
        if (build && build !== "dev" && build !== BUILD_ID) {
          fired = true;
          handler.current();
        }
      } catch {}
    };

    const onVisible = () => document.visibilityState === "visible" && check();
    const first = setTimeout(check, 15_000);
    const timer = setInterval(check, 30 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, []);
}
