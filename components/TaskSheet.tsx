"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetHeader } from "./Sheet";
import { Segmented, Switch } from "./ui";
import { Icon } from "./icons";
import { addDays, formatDue, nextMonday, nextWeekend, todayKey } from "@/lib/date";
import { makeTodo } from "@/lib/store";
import { newId, PRIORITY_LABELS, type Priority, type Todo, type TodoList } from "@/lib/types";

type Draft = Pick<Todo, "text" | "notes" | "due" | "time" | "priority" | "flagged" | "listId" | "subtasks">;

const fromTodo = (t: Todo): Draft => ({
  text: t.text,
  notes: t.notes,
  due: t.due,
  time: t.time,
  priority: t.priority,
  flagged: t.flagged,
  listId: t.listId,
  subtasks: t.subtasks,
});

export function TaskSheet({
  open,
  onClose,
  todo,
  defaults,
  lists,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  todo: Todo | null; // null = yeni görev
  defaults: Partial<Draft> & { listId: string };
  lists: TodoList[];
  onSave: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState<Draft>(() => blank(defaults));
  const [subInput, setSubInput] = useState("");
  const isNew = !todo;

  // Her açılışta taslağı sıfırla
  useEffect(() => {
    if (!open) return;
    setD(todo ? fromTodo(todo) : blank(defaults));
    setSubInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todo?.id]);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = d.text.trim();
    if (!text) return;
    const pending = subInput.trim();
    const subtasks = pending ? [...d.subtasks, { id: newId(), text: pending, done: false }] : d.subtasks;
    const clean = { ...d, text, notes: d.notes.trim(), subtasks };
    onSave(todo ? { ...todo, ...clean } : makeTodo(clean));
    onClose();
  };

  const addSub = () => {
    const text = subInput.trim();
    if (!text) return;
    set({ subtasks: [...d.subtasks, { id: newId(), text, done: false }] });
    setSubInput("");
  };

  const quickDates = [
    { label: "Bugün", value: todayKey() },
    { label: "Yarın", value: addDays(todayKey(), 1) },
    { label: "Hafta sonu", value: nextWeekend() },
    { label: "Gelecek hafta", value: nextMonday() },
  ];

  return (
    <Sheet open={open} onClose={onClose} label={isNew ? "Yeni görev" : "Görev ayrıntıları"}>
      <form onSubmit={save} className="sheet-form">
        <SheetHeader
          title={isNew ? "Yeni Görev" : "Ayrıntılar"}
          left={
            <button type="button" className="nav-btn" onClick={onClose}>
              İptal
            </button>
          }
          right={
            <button type="submit" className="nav-btn strong" disabled={!d.text.trim()}>
              {isNew ? "Ekle" : "Bitti"}
            </button>
          }
        />

        <div className="sheet-body">
          <div className="group">
            <input
              className="field title"
              value={d.text}
              onChange={(e) => set({ text: e.target.value })}
              placeholder="Başlık"
              aria-label="Başlık"
              autoFocus={isNew}
              enterKeyHint="done"
            />
            <textarea
              className="field notes"
              value={d.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Notlar"
              aria-label="Notlar"
              rows={2}
            />
          </div>

          <p className="group-label">Tarih ve saat</p>
          <div className="group">
            <div className="cell">
              <span className="cell-icon" style={{ background: "#FF453A" }}>
                <Icon name="calendar" size={17} />
              </span>
              <div className="cell-text">
                <span>Tarih</span>
                {d.due && <small className="accent-text">{formatDue(d.due)}</small>}
              </div>
              <Switch
                label="Tarih"
                checked={!!d.due}
                onChange={(on) => set(on ? { due: todayKey() } : { due: undefined, time: undefined })}
              />
            </div>
            {d.due && (
              <div className="cell sub">
                <div className="chips wrap">
                  {quickDates.map((q) => (
                    <button
                      type="button"
                      key={q.label}
                      className={`chip ${d.due === q.value ? "on" : ""}`}
                      onClick={() => set({ due: q.value })}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  className="native"
                  value={d.due}
                  onChange={(e) => set(e.target.value ? { due: e.target.value } : { due: undefined, time: undefined })}
                  aria-label="Tarih seç"
                />
              </div>
            )}
            <div className="cell">
              <span className="cell-icon" style={{ background: "#0A84FF" }}>
                <Icon name="clock" size={17} />
              </span>
              <div className="cell-text">
                <span>Saat</span>
                {d.time && <small className="accent-text">{d.time}</small>}
              </div>
              <Switch
                label="Saat"
                checked={!!d.time}
                onChange={(on) =>
                  set(on ? { time: "09:00", due: d.due ?? todayKey() } : { time: undefined })
                }
              />
            </div>
            {d.time && (
              <div className="cell sub">
                <input
                  type="time"
                  className="native"
                  value={d.time}
                  onChange={(e) => set({ time: e.target.value || undefined })}
                  aria-label="Saat seç"
                />
              </div>
            )}
          </div>

          <p className="group-label">Düzen</p>
          <div className="group">
            <div className="cell">
              <span className="cell-icon" style={{ background: "#FF9F0A" }}>
                <Icon name="flagFill" size={16} />
              </span>
              <div className="cell-text">
                <span>Bayrak</span>
              </div>
              <Switch label="Bayrak" checked={d.flagged} onChange={(flagged) => set({ flagged })} />
            </div>
            <div className="cell stack">
              <div className="cell-row">
                <span className="cell-icon" style={{ background: "#FF375F" }}>
                  <b className="bang">!</b>
                </span>
                <div className="cell-text">
                  <span>Öncelik</span>
                </div>
              </div>
              <Segmented
                label="Öncelik"
                value={d.priority}
                onChange={(priority: Priority) => set({ priority })}
                options={PRIORITY_LABELS.map((label, i) => ({
                  value: i as Priority,
                  label: i === 0 ? label : `${"!".repeat(i)} ${label}`,
                }))}
              />
            </div>
          </div>

          <p className="group-label">Liste</p>
          <div className="group pad">
            <div className="chips wrap" role="radiogroup" aria-label="Liste">
              {lists.map((l) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={d.listId === l.id}
                  key={l.id}
                  className={`chip ${d.listId === l.id ? "on" : ""}`}
                  onClick={() => set({ listId: l.id })}
                >
                  <i className="dot" style={{ background: l.color }} />
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <p className="group-label">
            Alt görevler
            {d.subtasks.length > 0 &&
              ` · ${d.subtasks.filter((s) => s.done).length}/${d.subtasks.length}`}
          </p>
          <div className="group">
            {d.subtasks.map((s) => (
              <div className="cell subtask" key={s.id}>
                <button
                  type="button"
                  className={`check small ${s.done ? "on" : ""}`}
                  aria-label={s.done ? "Tamamlanmadı" : "Tamamlandı"}
                  onClick={() =>
                    set({ subtasks: d.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })
                  }
                >
                  <Icon name="check" size={12} stroke={3.4} />
                </button>
                <input
                  className={`field inline ${s.done ? "done" : ""}`}
                  value={s.text}
                  aria-label="Alt görev"
                  onChange={(e) =>
                    set({
                      subtasks: d.subtasks.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)),
                    })
                  }
                  onBlur={() => set({ subtasks: d.subtasks.filter((x) => x.text.trim()) })}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Alt görevi sil"
                  onClick={() => set({ subtasks: d.subtasks.filter((x) => x.id !== s.id) })}
                >
                  <Icon name="xmark" size={16} />
                </button>
              </div>
            ))}
            <div className="cell subtask">
              <span className="add-dot">
                <Icon name="plus" size={14} stroke={2.6} />
              </span>
              <input
                className="field inline"
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSub();
                  }
                }}
                placeholder="Alt görev ekle"
                aria-label="Alt görev ekle"
                enterKeyHint="enter"
              />
            </div>
          </div>

          {todo && (
            <>
              <button
                type="button"
                className="group danger-row"
                onClick={() => {
                  onClose();
                  onDelete(todo.id);
                }}
              >
                <Icon name="trash" size={18} /> Görevi Sil
              </button>
              <p className="foot">
                Oluşturuldu: {new Date(todo.createdAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                {todo.completedAt &&
                  ` · Tamamlandı: ${new Date(todo.completedAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}`}
              </p>
            </>
          )}
        </div>
      </form>
    </Sheet>
  );
}

function blank(defaults: Partial<Draft> & { listId: string }): Draft {
  return { text: "", notes: "", priority: 0, flagged: false, subtasks: [], ...defaults };
}
