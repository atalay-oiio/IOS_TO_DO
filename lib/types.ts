import { DEFAULT_PAINT } from "./paint";

export type Priority = 0 | 1 | 2 | 3;

export type Subtask = { id: string; text: string; done: boolean };

export type Repeat = "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  notes: string;
  due?: string; // YYYY-MM-DD (yerel saat)
  time?: string; // HH:mm
  alert: number | null; // hatırlatma: saatten kaç dakika önce (null = yok)
  repeat?: Repeat; // tamamlanınca bir sonraki tarihe geçer (tarih gerekir)
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
export type Material = "matte" | "liquid";

export type Settings = {
  view: View; // son açık sekme; uygulama yeniden açılınca oradan devam eder
  theme: ThemeMode;
  accent: string; // paint id (eski "#rrggbb" kayıtları yüklenirken çevrilir)
  material: Material; // cam malzemesi: buzlu mat ya da parlak sıvı cam
  glass: number; // cam yoğunluğu: 0 şeffaf … 4 buzlu
  showCompleted: boolean;
  confirmDelete: boolean;
  celebrate: boolean;
  haptics: boolean; // Android'de dokunuşlarda hafif titreşim
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

export const REPEAT_LABELS: Record<Repeat, string> = {
  daily: "Her gün",
  weekdays: "Hafta içi",
  weekly: "Her hafta",
  monthly: "Her ay",
  yearly: "Her yıl",
};

export const PRIORITY_LABELS = ["Yok", "Düşük", "Orta", "Yüksek"] as const;

export const GLASS_LABELS = ["Şeffaf", "Hafif şeffaf", "Dengeli", "Hafif buzlu", "Buzlu"] as const;

export const MATERIAL_LABELS: Record<Material, string> = { matte: "Buzlu mat", liquid: "Sıvı cam" };

export const VIEW_TITLES: Record<View, string> = {
  today: "Bugün",
  planned: "Planlanan",
  all: "Tümü",
  flagged: "Bayraklı",
};

export const DEFAULT_SETTINGS: Settings = {
  view: "all",
  theme: "system",
  accent: DEFAULT_PAINT,
  material: "matte",
  glass: 2,
  showCompleted: true,
  confirmDelete: true,
  celebrate: true,
  haptics: true,
  sort: "manual",
  reminders: true,
  smartAdd: true,
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
