"use client";

import { useCallback, useEffect, useState } from "react";

export type PushState = {
  permission: NotificationPermission | "unsupported";
  server: "checking" | "ready" | "off"; // sunucu tarafı (VAPID + QStash) kurulu mu
  subscription: PushSubscriptionJSON | null;
};

export type NotifyPayload = { title: string; body: string; tag: string; id?: string };

const CONFIG_KEY = "glass-todo:push-config";
let registration: Promise<ServiceWorkerRegistration | null> | null = null;

// Service worker yalnızca üretimde (geliştirmede önbellek kafa karıştırır)
export function registerSW() {
  if (registration) return registration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
    registration = Promise.resolve(null);
  } else {
    registration = navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return registration;
}

type Config = { enabled: boolean; publicKey: string | null };

async function loadConfig(): Promise<Config> {
  try {
    const res = await fetch("/api/push/config", { cache: "no-store" });
    if (res.ok) {
      const cfg = (await res.json()) as Config;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
      return cfg;
    }
  } catch {}
  // Çevrimdışı: son bilinen yapılandırma
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as Config;
  } catch {}
  return { enabled: false, publicKey: null };
}

const toBytes = (b64: string) => {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const toB64 = (buf: ArrayBuffer | null) =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "";

export function usePush() {
  const [state, setState] = useState<PushState>({ permission: "unsupported", server: "checking", subscription: null });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState({ permission: "unsupported", server: "off", subscription: null });
      return;
    }
    const permission = Notification.permission;
    const [reg, cfg] = await Promise.all([registerSW(), loadConfig()]);
    const server = cfg.enabled && cfg.publicKey && reg && "pushManager" in reg ? "ready" : "off";
    let sub: PushSubscription | null = null;
    if (server === "ready" && reg && permission === "granted") {
      try {
        sub = await reg.pushManager.getSubscription();
        // Anahtar değiştiyse yeniden abone ol
        if (sub && toB64(sub.options.applicationServerKey) !== cfg.publicKey) {
          await sub.unsubscribe();
          sub = null;
        }
        sub ??= await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBytes(cfg.publicKey!),
        });
      } catch {
        sub = null;
      }
    }
    setState({ permission, server, subscription: sub ? sub.toJSON() : null });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Kullanıcı dokunuşuyla çağrılmalı (tarayıcı izni)
  const enable = useCallback(async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    await refresh();
  }, [refresh]);

  const showLocal = useCallback(async (p: NotifyPayload) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await registerSW();
    const options = { body: p.body, tag: p.tag, icon: "/pwa/192", badge: "/badge", data: p };
    if (reg) await reg.showNotification(p.title, { ...options, actions: [{ action: "done", title: "Tamamlandı" }] } as NotificationOptions);
    else new Notification(p.title, options);
  }, []);

  // Test: sunucu kuruluysa gerçek push (uygulama kapalıyken gelen yol), değilse yerel bildirim
  const test = useCallback(async (): Promise<"push" | "local" | "failed"> => {
    const payload = { title: "Test bildirimi", body: "Hatırlatmalar çalışıyor 🎉", tag: "glass-todo-test" };
    if (state.server === "ready" && state.subscription) {
      try {
        const res = await fetch("/api/push/schedule", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription: state.subscription, at: Date.now() + 2000, ...payload }),
        });
        if (res.ok) return "push";
      } catch {}
    }
    if (Notification.permission !== "granted") return "failed";
    await showLocal(payload);
    return "local";
  }, [state, showLocal]);

  return { state, enable, showLocal, test, refresh };
}
