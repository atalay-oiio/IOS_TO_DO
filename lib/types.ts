export type Priority = 0 | 1 | 2 | 3;

export type Subtask = { id: string; text: string; done: boolean };

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  notes: string;
  due?: string; // YYYY-MM-DD (yerel saat)
  time?: string; // HH:mm
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
  accent: string;
  showCompleted: boolean;
  confirmDelete: boolean;
  celebrate: boolean;
  sort: SortMode;
};

// iOS sistem renkleri
export const COLORS = [
  "#0A84FF", // mavi
  "#5E5CE6", // indigo
  "#BF5AF2", // mor
  "#FF375F", // pembe
  "#FF453A", // kırmızı
  "#FF9F0A", // turuncu
  "#FFD60A", // sarı
  "#30D158", // yeşil
  "#63E6E2", // nane
  "#64D2FF", // camgöbeği
  "#AC8E68", // kahverengi
  "#8E8E93", // gri
];

export const AURORA = "aurora";
export const ACCENTS = [AURORA, "#0A84FF", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#64D2FF"];

export const PRIORITY_LABELS = ["Yok", "Düşük", "Orta", "Yüksek"] as const;

export const VIEW_TITLES: Record<View, string> = {
  today: "Bugün",
  planned: "Planlanan",
  all: "Tümü",
  flagged: "Bayraklı",
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: AURORA,
  showCompleted: true,
  confirmDelete: true,
  celebrate: true,
  sort: "manual",
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
