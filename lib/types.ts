import { DEFAULT_PAINT } from "./paint";

export type Priority = 0 | 1 | 2 | 3;

export type Subtask = { id: string; text: string; done: boolean };

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  notes: string;
  due?: string; // YYYY-MM-DD (yerel saat)
  time?: string; // HH:mm
  alert: number | null; // hatırlatma: saatten kaç dakika önce (null = yok)
  priority: Priority;
  flagged: boolean;
  listId: string;
  subtasks: Subtask[];
  createdAt: number;
  completedAt?: number;
};

export type TodoList = { id: string; name: string; color: string };

export type View = "today" | "planned" | "all" | "flagged";
export type SortMode = "manual" | "due" | "priority" | "title";
export type ThemeMode = "system" | "light" | "dark";

export type Settings = {
  theme: ThemeMode;
  accent: string; // paint id ya da eski kayıtlardaki "#rrggbb"
  showCompleted: boolean;
  confirmDelete: boolean;
  celebrate: boolean;
  sort: SortMode;
  reminders: boolean;
  smartAdd: boolean;
};

export const ALERT_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Yok" },
  { value: 0, label: "Zamanında" },
  { value: 5, label: "5 dk önce" },
  { value: 15, label: "15 dk önce" },
  { value: 30, label: "30 dk önce" },
  { value: 60, label: "1 saat önce" },
  { value: 1440, label: "1 gün önce" },
];

export const PRIORITY_LABELS = ["Yok", "Düşük", "Orta", "Yüksek"] as const;

export const VIEW_TITLES: Record<View, string> = {
  today: "Bugün",
  planned: "Planlanan",
  all: "Tümü",
  flagged: "Bayraklı",
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: DEFAULT_PAINT,
  showCompleted: true,
  confirmDelete: true,
  celebrate: true,
  sort: "manual",
  reminders: true,
  smartAdd: true,
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
