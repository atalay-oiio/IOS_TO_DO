"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Todo = { id: string; text: string; done: boolean };

const STORAGE_KEY = "glass-todo:v1";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // localStorage'dan yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTodos(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // localStorage'a kaydet
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos, loaded]);

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  // %100 olunca tebrik et, sonra görevleri yeniden başlat
  useEffect(() => {
    if (total > 0 && doneCount === total && !celebrate) {
      const t = setTimeout(() => setCelebrate(true), 500);
      return () => clearTimeout(t);
    }
  }, [doneCount, total, celebrate]);

  const restart = () => {
    setTodos((prev) => prev.map((t) => ({ ...t, done: false })));
    setCelebrate(false);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: newId(), text, done: false }]);
    setInput("");
  };

  const toggle = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const saveEdit = (id: string, text: string) => {
    const clean = text.trim();
    if (clean) setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: clean } : t)));
    setEditingId(null);
  };

  const remove = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setConfirmId(null);
  };

  // Basılı tut → sürükle (mobilde 250ms bekleme, masaüstünde 6px hareket)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setTodos((prev) => {
      const from = prev.findIndex((t) => t.id === active.id);
      const to = prev.findIndex((t) => t.id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const confirmTodo = todos.find((t) => t.id === confirmId);

  return (
    <main className="shell">
      <header className="glass header">
        <div className="header-text">
          <p className="eyebrow">Bugün</p>
          <h1>Görevlerim</h1>
          <p className="sub">
            {total === 0
              ? "Henüz görev yok"
              : `${doneCount} / ${total} görev tamamlandı`}
          </p>
        </div>
        <ProgressRing percent={percent} />
      </header>

      <div className="glass bar-wrap" aria-hidden>
        <div className="bar" style={{ width: `${percent}%` }} />
      </div>

      <form className="glass add" onSubmit={add}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Yeni görev ekle…"
          aria-label="Yeni görev"
        />
        <button type="submit" className="add-btn" aria-label="Ekle" disabled={!input.trim()}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      {total > 0 && <p className="hint">Sıralamak için basılı tutup sürükle · Düzenlemek için metne dokun</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="list">
            {todos.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                editing={editingId === t.id}
                onToggle={() => toggle(t.id)}
                onEdit={() => setEditingId(t.id)}
                onSave={(text) => saveEdit(t.id, text)}
                onCancel={() => setEditingId(null)}
                onDelete={() => setConfirmId(t.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {total === 0 && loaded && (
        <div className="glass empty">
          <span className="empty-emoji">✨</span>
          <p>Listen boş. İlk görevini yukarıdan ekle.</p>
        </div>
      )}

      {confirmTodo && (
        <div className="overlay" onClick={() => setConfirmId(null)}>
          <div className="glass sheet" role="alertdialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2>Görevi sil?</h2>
            <p>
              <strong>“{confirmTodo.text}”</strong> görevini gerçekten silmek istiyor musun?
            </p>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={() => setConfirmId(null)} autoFocus>
                Vazgeç
              </button>
              <button className="btn danger" onClick={() => remove(confirmTodo.id)}>
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="overlay">
          <Confetti />
          <div className="glass sheet celebrate" role="alertdialog" aria-modal>
            <div className="trophy">🎉</div>
            <h2>Tebrikler!</h2>
            <p>Bütün görevleri tamamladın. Harika iş çıkardın!</p>
            <div className="sheet-actions">
              <button className="btn primary" onClick={restart} autoFocus>
                Yeniden Başla
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TodoRow({
  todo,
  editing,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  todo: Todo;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: editing,
  });
  const [draft, setDraft] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(todo.text);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, todo.text]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`glass row ${todo.done ? "done" : ""} ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <button
        className={`check ${todo.done ? "on" : ""}`}
        onClick={onToggle}
        aria-label={todo.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {editing ? (
        <form
          className="edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(draft)}
            onKeyDown={(e) => e.key === "Escape" && onCancel()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Görevi düzenle"
          />
        </form>
      ) : (
        <span className="text" onClick={onEdit} title="Düzenlemek için dokun">
          {todo.text}
        </span>
      )}

      {!editing && (
        <button className="icon-btn edit" onClick={onEdit} aria-label="Düzenle">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <button className="icon-btn del" onClick={onDelete} aria-label="Sil">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="grip" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M5 9h14M5 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </li>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7cf8ff" />
            <stop offset="50%" stopColor="#8b7bff" />
            <stop offset="100%" stopColor="#ff7ad9" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
        />
      </svg>
      <span className="ring-label">
        {percent}
        <small>%</small>
      </span>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 });
  const colors = ["#7cf8ff", "#8b7bff", "#ff7ad9", "#ffd166", "#6effa8"];
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 12) * 0.08}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            transform: `rotate(${i * 37}deg)`,
          }}
        />
      ))}
    </div>
  );
}
