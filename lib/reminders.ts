"use client";

import { useEffect, useRef } from "react";
import { formatDue } from "./date";
import type { NotifyPayload } from "./push-client";
import type { Todo } from "./types";

const KEY = "glass-todo:reminders";
// QStash ücretsiz planda mesaj en fazla 7 gün ileriye zamanlanabilir; daha uzaktakiler
// uygulama sonraki açılışlarda bu pencereye girince zamanlanır.
const SERVER_WINDOW = 7 * 24 * 3_600_000 - 3_600_000;
const LOCAL_WINDOW = 24 * 3_600_000;

export function reminderAt(t: Todo) {
  if (t.done || !t.due || !t.time || t.alert === null) return null;
  const [y, m, d] = t.due.split("-").map(Number);
  const [hh, mm] = t.time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime() - t.alert * 60_000;
}

const left = (min: number) => (min < 60 ? `${min} dk` : min < 1440 ? `${min / 60} saat` : `${min / 1440} gün`);

export function reminderPayload(t: Todo): NotifyPayload {
  const when = formatDue(t.due!, t.time);
  const note = t.notes.split("\n")[0].slice(0, 80);
  const body = (t.alert ? `${when} · ${left(t.alert)} kaldı` : when) + (note ? `\n${note}` : "");
  return { title: t.text, body, tag: `todo-${t.id}`, id: t.id };
}

type Store = { endpoint: string | null; items: Record<string, { at: number; key: string; messageId: string }> };

const load = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {}
  return { endpoint: null, items: {} };
};
const save = (s: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};

const post = async (path: string, body: unknown) => {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? ((await res.json()) as { messageId?: string }) : null;
  } catch {
    return null;
  }
};

// Sunucudaki zamanlanmış bildirimleri görevlerle eşitle (değişenleri iptal et, yenileri zamanla)
async function syncServer(todos: Todo[], enabled: boolean, sub: PushSubscriptionJSON) {
  if (!navigator.onLine) return;
  const store = load();
  const now = Date.now();

  if (store.endpoint && store.endpoint !== sub.endpoint) {
    for (const e of Object.values(store.items)) await post("/api/push/cancel", { messageId: e.messageId });
    store.items = {};
  }
  store.endpoint = sub.endpoint ?? null;

  const want = new Map<string, { at: number; key: string; todo: Todo }>();
  if (enabled)
    for (const t of todos) {
      const at = reminderAt(t);
      if (at !== null && at > now + 3000 && at - now < SERVER_WINDOW)
        want.set(t.id, { at, key: `${at}|${t.alert}|${t.text}|${t.notes.slice(0, 80)}`, todo: t });
    }

  for (const [id, e] of Object.entries(store.items)) {
    const w = want.get(id);
    if (e.at <= now) delete store.items[id];
    else if (!w || w.key !== e.key) {
      await post("/api/push/cancel", { messageId: e.messageId });
      delete store.items[id];
    }
  }
  save(store);

  for (const [id, w] of want) {
    if (store.items[id]) continue;
    const res = await post("/api/push/schedule", { subscription: sub, at: w.at, ...reminderPayload(w.todo) });
    if (res?.messageId) {
      store.items[id] = { at: w.at, key: w.key, messageId: res.messageId };
      save(store);
    }
  }
}

// Eşitlemeleri sıraya koy; beklerken gelen yeni istek eskisinin yerini alır
let running = false;
let next: (() => Promise<void>) | null = null;
async function queue(job: () => Promise<void>) {
  next = job;
  if (running) return;
  running = true;
  while (next) {
    const j = next;
    next = null;
    await j().catch(() => {});
  }
  running = false;
}

export function useReminders({
  todos,
  enabled,
  subscription,
  onFire,
}: {
  todos: Todo[] | null; // null = henüz yüklenmedi (boş listeyle her şeyi iptal etmesin)
  enabled: boolean;
  subscription: PushSubscriptionJSON | null;
  onFire: (todo: Todo, viaPush: boolean) => void;
}) {
  const fire = useRef(onFire);
  fire.current = onFire;
  const latest = useRef({ todos, enabled });
  latest.current = { todos, enabled };

  // Uygulama açıkken: yerel zamanlayıcılar (uygulama içi bildirim şeridi + sunucu yoksa sistem bildirimi)
  useEffect(() => {
    if (!enabled || !todos) return;
    const now = Date.now();
    const timers = todos.flatMap((t) => {
      const at = reminderAt(t);
      if (at === null || at <= now || at - now > LOCAL_WINDOW) return [];
      return [setTimeout(() => fire.current(t, !!subscription), at - now)];
    });
    return () => timers.forEach(clearTimeout);
  }, [todos, enabled, subscription]);

  // Sunucu: görevler değişince (gecikmeli) eşitle
  useEffect(() => {
    if (!subscription || !todos) return;
    const t = setTimeout(() => queue(() => syncServer(todos, enabled, subscription)), 1200);
    return () => clearTimeout(t);
  }, [todos, enabled, subscription]);

  // Tekrar çevrimiçi olunca, uygulamaya dönünce ve yarım saatte bir
  useEffect(() => {
    if (!subscription) return;
    const run = () => {
      const { todos: list, enabled: on } = latest.current;
      if (list) queue(() => syncServer(list, on, subscription));
    };
    const onVisible = () => document.visibilityState === "visible" && run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    const iv = setInterval(run, 30 * 60_000);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(iv);
    };
  }, [subscription]);
}
