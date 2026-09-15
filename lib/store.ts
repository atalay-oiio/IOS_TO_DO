"use client";

import { useCallback, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  AURORA,
  COLORS,
  DEFAULT_SETTINGS,
  newId,
  type Priority,
  type Settings,
  type Subtask,
  type Todo,
  type TodoList,
} from "./types";

const DATA_KEY = "glass-todo:v2";
const LEGACY_KEY = "glass-todo:v1";
export const SETTINGS_KEY = "glass-todo:settings";

const DEFAULT_LISTS: TodoList[] = [
  { id: "personal", name: "Kişisel", color: "#0A84FF" },
  { id: "work", name: "İş", color: "#FF9F0A" },
  { id: "shopping", name: "Alışveriş", color: "#30D158" },
];

type Data = { todos: Todo[]; lists: TodoList[] };

// ---------- Doğrulama (bozuk / içe aktarılan veriye karşı) ----------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const dateKey = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const timeKey = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : undefined);

function normalizeList(v: unknown): TodoList | null {
  if (!isObj(v) || !str(v.name).trim()) return null;
  return { id: str(v.id) || newId(), name: str(v.name).trim(), color: str(v.color, COLORS[0]) };
}

function normalizeSubtask(v: unknown): Subtask | null {
  if (!isObj(v) || !str(v.text).trim()) return null;
  return { id: str(v.id) || newId(), text: str(v.text).trim(), done: v.done === true };
}

function normalizeTodo(v: unknown, listIds: Set<string>, fallbackList: string): Todo | null {
  if (!isObj(v) || !str(v.text).trim()) return null;
  const p = Number(v.priority);
  const listId = str(v.listId);
  const due = dateKey(v.due);
  return {
    id: str(v.id) || newId(),
    text: str(v.text).trim(),
    done: v.done === true,
    notes: str(v.notes),
    due,
    time: due ? timeKey(v.time) : undefined,
    priority: (p >= 0 && p <= 3 ? Math.round(p) : 0) as Priority,
    flagged: v.flagged === true,
    listId: listIds.has(listId) ? listId : fallbackList,
    subtasks: Array.isArray(v.subtasks) ? v.subtasks.map(normalizeSubtask).filter((s): s is Subtask => !!s) : [],
    createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
    completedAt: typeof v.completedAt === "number" ? v.completedAt : undefined,
  };
}

// v2 nesnesi, ya da v1'deki düz dizi kabul edilir
export function normalizeData(raw: unknown): Data | null {
  const rawTodos = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.todos) ? raw.todos : null;
  if (!rawTodos) return null;
  let lists =
    isObj(raw) && Array.isArray(raw.lists)
      ? raw.lists.map(normalizeList).filter((l): l is TodoList => !!l)
      : [];
  if (lists.length === 0) lists = DEFAULT_LISTS;
  const ids = new Set(lists.map((l) => l.id));
  const todos = rawTodos
    .map((t) => normalizeTodo(t, ids, lists[0].id))
    .filter((t): t is Todo => !!t);
  return { todos, lists };
}

function loadData(): Data {
  try {
    const v2 = localStorage.getItem(DATA_KEY);
    if (v2) return normalizeData(JSON.parse(v2)) ?? { todos: [], lists: DEFAULT_LISTS };
    // v1 → v2 geçişi (eski anahtar yedek olarak yerinde bırakılır)
    const v1 = localStorage.getItem(LEGACY_KEY);
    if (v1) return normalizeData(JSON.parse(v1)) ?? { todos: [], lists: DEFAULT_LISTS };
  } catch {}
  return { todos: [], lists: DEFAULT_LISTS };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function makeTodo(partial: Partial<Todo> & { text: string; listId: string }): Todo {
  return {
    done: false,
    notes: "",
    priority: 0,
    flagged: false,
    subtasks: [],
    createdAt: Date.now(),
    ...partial,
    id: newId(),
  };
}

// ---------- Mağaza ----------
export function useTodoStore() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>(DEFAULT_LISTS);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const d = loadData();
    setTodos(d.todos);
    setLists(d.lists);
    setSettingsState(loadSettings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify({ todos, lists }));
    } catch {}
  }, [todos, lists, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, loaded]);

  const setSettings = useCallback(
    (patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch })),
    []
  );

  const add = useCallback((todo: Todo) => setTodos((prev) => [...prev, todo]), []);

  const update = useCallback(
    (id: string, patch: Partial<Todo>) =>
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    []
  );

  const toggle = useCallback(
    (id: string) =>
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: !t.done, completedAt: t.done ? undefined : Date.now() } : t
        )
      ),
    []
  );

  const remove = useCallback((id: string) => setTodos((prev) => prev.filter((t) => t.id !== id)), []);

  // Geri al: silinen görevi eski konumuna geri koy
  const restore = useCallback(
    (todo: Todo, index: number) =>
      setTodos((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, todo);
        return next;
      }),
    []
  );

  const reorder = useCallback(
    (activeId: string, overId: string) =>
      setTodos((prev) => {
        const from = prev.findIndex((t) => t.id === activeId);
        const to = prev.findIndex((t) => t.id === overId);
        return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
      }),
    []
  );

  const setDone = useCallback(
    (ids: Set<string>, done: boolean) =>
      setTodos((prev) =>
        prev.map((t) =>
          ids.has(t.id) ? { ...t, done, completedAt: done ? t.completedAt ?? Date.now() : undefined } : t
        )
      ),
    []
  );

  const removeMany = useCallback(
    (ids: Set<string>) => setTodos((prev) => prev.filter((t) => !ids.has(t.id))),
    []
  );

  const saveList = useCallback(
    (list: TodoList) =>
      setLists((prev) =>
        prev.some((l) => l.id === list.id) ? prev.map((l) => (l.id === list.id ? list : l)) : [...prev, list]
      ),
    []
  );

  // Liste silinince içindeki görevler de silinir (iOS Anımsatıcılar gibi)
  const removeList = useCallback((id: string) => {
    setLists((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
    setTodos((prev) => prev.filter((t) => t.listId !== id));
  }, []);

  const replaceAll = useCallback((data: Data) => {
    setLists(data.lists);
    setTodos(data.todos);
  }, []);

  return {
    loaded,
    todos,
    lists,
    settings,
    setSettings,
    add,
    update,
    toggle,
    remove,
    restore,
    reorder,
    setDone,
    removeMany,
    saveList,
    removeList,
    replaceAll,
  };
}

// Temayı ve vurgu rengini <html>'e uygular
export function useApplyTheme(settings: Settings, loaded: boolean) {
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && mq.matches);
      root.dataset.theme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#07070f" : "#eef0f8");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const vars = ["--accent", "--accent-grad", "--ring-1", "--ring-2", "--ring-3"];
    if (settings.accent === AURORA) {
      vars.forEach((v) => root.style.removeProperty(v));
    } else {
      const c = settings.accent;
      const light = `color-mix(in srgb, ${c} 60%, white)`;
      root.style.setProperty("--accent", c);
      root.style.setProperty("--accent-grad", `linear-gradient(135deg, ${light}, ${c})`);
      root.style.setProperty("--ring-1", light);
      root.style.setProperty("--ring-2", c);
      root.style.setProperty("--ring-3", c);
    }
  }, [settings.accent, loaded]);
}
