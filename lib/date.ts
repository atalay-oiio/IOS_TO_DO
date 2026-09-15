// Tarihler "YYYY-MM-DD" anahtarı olarak yerel saatte tutulur.
// (toISOString UTC'ye çevirdiği için gece yarısı civarında yanlış güne kayar.)

const pad = (n: number) => String(n).padStart(2, "0");

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (key: string, n: number) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const diffDays = (from: string, to: string) =>
  Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000);

// Cumartesi (bugün hafta sonuysa bir sonraki)
export const nextWeekend = () => {
  const d = new Date();
  const day = d.getDay();
  const add = day === 6 ? 7 : day === 0 ? 6 : 6 - day;
  d.setDate(d.getDate() + add);
  return toKey(d);
};

// Gelecek pazartesi
export const nextMonday = () => {
  const d = new Date();
  const add = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + add);
  return toKey(d);
};

const dayFmt = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
const shortFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
const headerFmt = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" });

export const headerDate = () => headerFmt.format(new Date());

export function formatDue(due: string, time?: string) {
  const today = todayKey();
  const diff = diffDays(today, due);
  let label: string;
  if (diff === 0) label = "Bugün";
  else if (diff === 1) label = "Yarın";
  else if (diff === -1) label = "Dün";
  else if (diff > 1 && diff < 7) label = dayFmt.format(parseKey(due));
  else if (parseKey(due).getFullYear() === new Date().getFullYear()) label = shortFmt.format(parseKey(due));
  else label = longFmt.format(parseKey(due));
  return time ? `${label} ${time}` : label;
}

export function isOverdue(due: string | undefined, time: string | undefined, now = new Date()) {
  if (!due) return false;
  const today = toKey(now);
  if (due < today) return true;
  if (due > today || !time) return false;
  return time < `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// "Planlanan" görünümündeki bölüm başlığı
export function dueGroup(due: string) {
  const diff = diffDays(todayKey(), due);
  if (diff < 0) return "Gecikmiş";
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff < 7) return "Bu Hafta";
  if (diff < 30) return "Bu Ay";
  return "Daha Sonra";
}
