// Doğal dille hızlı ekleme: "yarın 15:00 toplantı !! #iş" → başlık + tarih + saat + öncelik + liste
import { toKey } from "./date";
import type { Priority, TodoList } from "./types";

export type Parsed = {
  text: string;
  due?: string;
  time?: string;
  priority?: Priority;
  listId?: string;
  found: boolean;
};

const W = "[\\p{L}\\p{N}]";
const B = `(?<!${W})`; // kelime başı (Türkçe harfler dahil)
const E = `(?!${W})`; // kelime sonu
const SUF = "(?:['’]?(?:[dt][ae]|y?[ae]|n[ae]|ki))?"; // -de/-da/-te/-ta, -e/-a/-ye/-ya, -ne/-na, -ki
const LOC = "(?:['’]?[dt][ae])"; // 3'te, 15:00'da
const UNTIL = "(?:\\s+kadar)?";
const PERIOD = "(sabah|öğleden\\s+sonra|öğlen?|akşam|gece)(?:leyin|ları|leri|ı|i)?";
const DAYS = "pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar";

const WEEKDAY: Record<string, number> = {
  pazar: 0,
  pazartesi: 1,
  salı: 2,
  çarşamba: 3,
  perşembe: 4,
  cuma: 5,
  cumartesi: 6,
};
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const NUMBERS: Record<string, number> = {
  yarım: 0.5, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
};

// Gün bölümü → varsayılan saat ve verilen saati kaydırma kuralı
const PERIODS: Record<string, { hour: number; shift: (h: number) => number }> = {
  sabah: { hour: 9, shift: (h) => h },
  öğlen: { hour: 12, shift: (h) => (h < 6 ? h + 12 : h) },
  "öğleden sonra": { hour: 15, shift: (h) => (h < 12 ? h + 12 : h) },
  akşam: { hour: 19, shift: (h) => (h < 12 ? h + 12 : h) },
  gece: { hour: 22, shift: (h) => (h >= 6 && h < 12 ? h + 12 : h === 12 ? 0 : h) },
};

const re = (s: string) => new RegExp(s, "gu");
const RX = {
  prio: re("(?<!\\S)(!{1,3})(?!\\S)"),
  prioTail: re("(?<=[\\p{L}\\p{N}])(!{2,3})(?!\\S)"),
  list: re("(?<!\\S)#([\\p{L}\\p{N}_-]{1,30})"),
  time: re(`${B}(?:(bu\\s+)?${PERIOD}\\s+)?(saat\\s*)?(\\d{1,2})(?:([:.])(\\d{2}))?(${LOC})?${E}`),
  relative: re(`${B}(\\d{1,3}|${Object.keys(NUMBERS).join("|")})\\s*(dakika|dk|saat|sa|gün|hafta|ay)\\s+sonra${E}`),
  nextWeek: re(`${B}(?:haftaya|gelecek\\s+hafta(?:ya)?|önümüzdeki\\s+hafta(?:ya)?)(?:\\s+(${DAYS})(?:\\s+günü)?)?${SUF}${UNTIL}${E}`),
  weekend: re(`${B}(?:bu\\s+)?hafta\\s*sonu(?:na)?${UNTIL}${E}`),
  monthEnd: re(`${B}ay\\s+sonu(?:na)?${UNTIL}${E}`),
  plus2: re(`${B}(?:öbür\\s*gün|yarından\\s+sonra|ertesi\\s+gün)${SUF}${UNTIL}${E}`),
  dayWord: re(`${B}(yarın|bugün)${SUF}${UNTIL}${E}`),
  thisPeriod: re(`${B}bu\\s+${PERIOD}${E}`),
  // "pazar" tek başına ya da "pazar günü"; "pazara/pazarda" (market) yakalanmaz
  weekday: re(`${B}(?:(pazartesi|salı|çarşamba|perşembe|cumartesi|cuma)(?:\\s+günü)?${SUF}|(pazar)(?:\\s+günü${SUF}|['’](?:[dt][ae]|y?[ae]))?)${UNTIL}${E}`),
  monthDate: re(`${B}(\\d{1,2})\\s*(${MONTHS.join("|")})(?:\\s+(\\d{4}))?${SUF}${UNTIL}${E}`),
  numDate: re(`${B}(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?${SUF}${UNTIL}${E}`),
};

const pad = (n: number) => String(n).padStart(2, "0");
const shiftDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const periodKey = (p: string) => (p.startsWith("öğleden") ? "öğleden sonra" : p.startsWith("öğle") ? "öğlen" : p);

export function parseQuick(input: string, lists: TodoList[], now = new Date()): Parsed {
  let work = input.toLocaleLowerCase("tr");
  if (work.length !== input.length) return { text: input.trim(), found: false };

  const cuts: [number, number][] = [];
  // İlk kabul edilen eşleşmeyi metinden çıkar (indeksler korunur)
  const take = (rx: RegExp, accept: (m: RegExpMatchArray) => boolean = () => true) => {
    for (const m of work.matchAll(rx)) {
      if (m.index === undefined || !accept(m)) continue;
      const end = m.index + m[0].length;
      cuts.push([m.index, end]);
      work = work.slice(0, m.index) + " ".repeat(m[0].length) + work.slice(end);
      return m;
    }
    return null;
  };

  const today = shiftDays(now, 0);
  let date: Date | undefined;
  let dateEnd = -1;
  let hour: number | undefined;
  let minute = 0;
  let period: string | undefined;
  let exact: { due: string; time: string } | undefined;
  let priority: Priority | undefined;
  let listId: string | undefined;

  const setDate = (d: Date, m: RegExpMatchArray) => {
    date = d;
    dateEnd = (m.index ?? 0) + m[0].length;
  };

  // 1) Öncelik
  const p = take(RX.prio) ?? take(RX.prioTail);
  if (p) priority = p[1].length as Priority;

  // 2) Liste etiketi (#iş)
  take(RX.list, (m) => {
    const tag = m[1];
    const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, "");
    const hit = lists.find((l) => fold(l.name) === tag) ?? lists.find((l) => fold(l.name).startsWith(tag));
    if (hit) listId = hit.id;
    return !!hit;
  });

  // 3) Saat: "15:00", "saat 9", "3'te", "akşam 8'de", "bu akşam 7"
  take(RX.time, (m) => {
    const [, bu, per, saat, h, sep, min, loc] = m;
    const hh = Number(h);
    const mm = min ? Number(min) : 0;
    if (hh > 23 || mm > 59) return false;
    if (!(sep === ":" || saat || loc || per)) return false;
    hour = hh;
    minute = mm;
    if (per) period = periodKey(per);
    if (bu && !date) date = today;
    return true;
  });

  // 4) Göreli: "2 saat sonra", "30 dk sonra", "3 gün sonra"
  take(RX.relative, (m) => {
    const n = NUMBERS[m[1]] ?? Number(m[1]);
    const unit = m[2];
    if (unit === "dakika" || unit === "dk" || unit === "saat" || unit === "sa") {
      const ms = n * (unit === "dakika" || unit === "dk" ? 60_000 : 3_600_000);
      const at = new Date(now.getTime() + ms);
      exact = { due: toKey(at), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` };
    } else {
      if (!Number.isInteger(n)) return false;
      const d = shiftDays(today, 0);
      if (unit === "gün") d.setDate(d.getDate() + n);
      if (unit === "hafta") d.setDate(d.getDate() + n * 7);
      if (unit === "ay") d.setMonth(d.getMonth() + n);
      setDate(d, m);
    }
    return true;
  });

  // 5) Tarih ifadeleri (ilk bulunan geçerli)
  const dateRules: (() => unknown)[] = [
    () =>
      take(RX.nextWeek, (m) => {
        const monday = shiftDays(today, ((8 - today.getDay()) % 7) || 7);
        setDate(m[1] ? shiftDays(monday, (WEEKDAY[m[1]] + 6) % 7) : monday, m);
        return true;
      }),
    () =>
      take(RX.weekend, (m) => {
        const day = today.getDay();
        setDate(shiftDays(today, day === 6 || day === 0 ? 0 : 6 - day), m);
        return true;
      }),
    () =>
      take(RX.monthEnd, (m) => {
        setDate(new Date(today.getFullYear(), today.getMonth() + 1, 0), m);
        return true;
      }),
    () => take(RX.plus2, (m) => (setDate(shiftDays(today, 2), m), true)),
    () => take(RX.dayWord, (m) => (setDate(shiftDays(today, m[1] === "yarın" ? 1 : 0), m), true)),
    () =>
      take(RX.thisPeriod, (m) => {
        setDate(today, m);
        period ??= periodKey(m[1]);
        return true;
      }),
    () =>
      take(RX.weekday, (m) => {
        const target = WEEKDAY[m[1] ?? m[2]];
        setDate(shiftDays(today, ((target - today.getDay() + 7) % 7) || 7), m);
        return true;
      }),
    () =>
      take(RX.monthDate, (m) => {
        const d = makeDate(Number(m[1]), MONTHS.indexOf(m[2]) + 1, m[3], today);
        if (d) setDate(d, m);
        return !!d;
      }),
    () =>
      take(RX.numDate, (m) => {
        const d = makeDate(Number(m[1]), Number(m[2]), m[3], today);
        if (d) setDate(d, m);
        return !!d;
      }),
  ];
  if (!exact)
    for (const rule of dateRules) {
      if (dateEnd >= 0) break;
      rule();
    }

  // 6) Tarihin hemen ardındaki gün bölümü: "yarın akşam", "cuma sabahı" ("akşam yemeği" hariç)
  if (dateEnd >= 0 && hour === undefined && !period) {
    const rest = work.slice(dateEnd);
    const m = new RegExp(`^\\s+${PERIOD}(?!\\s+yeme)${E}`, "u").exec(rest);
    if (m) {
      period = periodKey(m[1]);
      const start = dateEnd + m[0].length - m[0].trimStart().length;
      cuts.push([start, dateEnd + m[0].length]);
    }
  }

  // 7) Saati ve tarihi birleştir
  let due = exact?.due ?? (date ? toKey(date) : undefined);
  let time = exact?.time;
  if (!exact) {
    if (hour !== undefined) {
      if (period) hour = PERIODS[period].shift(hour);
      else if (hour >= 1 && hour <= 6) hour += 12; // "saat 3" → 15:00
      time = `${pad(hour)}:${pad(minute)}`;
    } else if (period) {
      time = `${pad(PERIODS[period].hour)}:00`;
    }
    if (time && !due) {
      const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      due = toKey(time > nowHM ? today : shiftDays(today, 1));
    }
  }

  // 8) Başlığı temizle
  cuts.sort((a, b) => a[0] - b[0]);
  let text = "";
  let pos = 0;
  for (const [s, e] of cuts) {
    if (s > pos) text += input.slice(pos, s);
    text += " ";
    pos = Math.max(pos, e);
  }
  text += input.slice(pos);
  text = text.replace(/\s{2,}/g, " ").replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, "").trim();

  const found = cuts.length > 0;
  return { text, due, time, priority, listId, found };
}

function makeDate(day: number, month: number, year: string | undefined, today: Date) {
  if (month < 1 || month > 12 || day < 1) return undefined;
  let y = year ? Number(year.length === 2 ? `20${year}` : year) : today.getFullYear();
  if (day > new Date(y, month, 0).getDate()) return undefined;
  let d = new Date(y, month - 1, day);
  if (!year && d < today) {
    y += 1;
    d = new Date(y, month - 1, day);
  }
  return d;
}
