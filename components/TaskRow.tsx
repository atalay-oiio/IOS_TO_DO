"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "./icons";
import { formatDue, isOverdue } from "@/lib/date";
import type { Todo, TodoList } from "@/lib/types";

const ACTIONS_W = 144; // sola kaydırınca açılan iki butonun genişliği

type Props = {
  todo: Todo;
  list?: TodoList;
  showList: boolean;
  sortable: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onInfo: () => void;
  onFlag: () => void;
  onDelete: () => void;
};

export function TaskRow({
  todo,
  list,
  showList,
  sortable,
  editing,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onInfo,
  onFlag,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id, disabled: editing || !sortable });

  const [draft, setDraft] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter/Escape sonrası input kaldırılırken gelen blur'un tekrar kaydetmesini engeller
  const finished = useRef(false);

  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const swipe = useRef<{ x: number; y: number; base: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const draggingRef = useRef(isDragging);
  draggingRef.current = isDragging;

  useEffect(() => {
    if (!editing) return;
    finished.current = false;
    setDraft(todo.text);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [editing, todo.text]);

  // Açık kaydırma menüsü: dışarı dokununca kapat
  useEffect(() => {
    if (offset === 0 || swiping) return;
    const close = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOffset(0);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [offset, swiping]);

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (save) onSave(draft);
    else onCancel();
  };

  // ---------- Dokunmatik kaydırma (masaüstünde hover butonları var) ----------
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || editing) return;
    swipe.current = { x: e.clientX, y: e.clientY, base: offset, active: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // dikey hareket = sayfa kaydırma, basılı tutma = sıralama
      if (Math.abs(dy) > Math.abs(dx) || draggingRef.current) {
        swipe.current = null;
        return;
      }
      s.active = true;
      setSwiping(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const width = rowRef.current?.offsetWidth ?? 360;
    setOffset(Math.max(-width, Math.min(120, s.base + dx)));
  };

  const onPointerUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    setSwiping(false);
    suppressClick.current = true;
    const width = rowRef.current?.offsetWidth ?? 360;
    if (offset > 70) {
      onToggle();
      setOffset(0);
    } else if (offset < -width * 0.6) {
      setOffset(0);
      onDelete();
    } else if (offset < -50) setOffset(-ACTIONS_W);
    else setOffset(0);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    } else if (offset !== 0 && !(e.target as HTMLElement).closest(".row-actions")) {
      e.stopPropagation();
      setOffset(0);
    }
  };

  const overdue = !todo.done && isOverdue(todo.due, todo.time);
  const subDone = todo.subtasks.filter((s) => s.done).length;
  const hasMeta = todo.due || todo.subtasks.length > 0 || (showList && list);

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        rowRef.current = el;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition, "--o": `${offset}px` } as CSSProperties}
      className={`row ${todo.done ? "done" : ""} ${isDragging ? "dragging" : ""}`}
      {...listeners}
    >
      <div className="row-actions left" style={{ opacity: offset > 0 ? 1 : 0 }} aria-hidden={offset <= 0}>
        <span className={`swipe-done ${offset > 70 ? "armed" : ""}`}>
          <Icon name={todo.done ? "restart" : "check"} size={22} stroke={2.4} />
        </span>
      </div>
      <div className="row-actions right" style={{ opacity: offset < 0 ? 1 : 0 }} aria-hidden={offset >= 0}>
        <button
          type="button"
          className="swipe-btn flag"
          tabIndex={-1}
          onClick={() => {
            onFlag();
            setOffset(0);
          }}
        >
          <Icon name={todo.flagged ? "flag" : "flagFill"} size={20} />
          <span>{todo.flagged ? "Kaldır" : "Bayrak"}</span>
        </button>
        <button
          type="button"
          className="swipe-btn delete"
          tabIndex={-1}
          onClick={() => {
            setOffset(0);
            onDelete();
          }}
        >
          <Icon name="trash" size={20} />
          <span>Sil</span>
        </button>
      </div>

      <div
        className={`row-content ${swiping ? "swiping" : ""}`}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <button
          type="button"
          className={`check ${todo.done ? "on" : ""}`}
          style={{ "--c": list?.color ?? "var(--accent)" } as CSSProperties}
          onClick={onToggle}
          aria-label={todo.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
        >
          <Icon name="check" size={15} stroke={3.2} />
        </button>

        <div className="row-main">
          {editing ? (
            <form
              className="edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                finish(true);
              }}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => finish(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    finish(false);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                aria-label="Görevi düzenle"
              />
            </form>
          ) : (
            <span className="text" onClick={onEdit}>
              {todo.priority > 0 && <b className="prio">{"!".repeat(todo.priority)} </b>}
              {todo.text}
            </span>
          )}
          {todo.notes && !editing && <p className="row-note">{todo.notes}</p>}
          {hasMeta && !editing && (
            <div className="row-meta">
              {todo.due && (
                <span className={`meta ${overdue ? "overdue" : ""}`}>
                  <Icon name="calendar" size={13} stroke={2.2} />
                  {formatDue(todo.due, todo.time)}
                </span>
              )}
              {todo.subtasks.length > 0 && (
                <span className="meta">
                  <Icon name="list" size={13} stroke={2.2} />
                  {subDone}/{todo.subtasks.length}
                </span>
              )}
              {showList && list && (
                <span className="meta">
                  <i className="dot" style={{ background: list.color }} />
                  {list.name}
                </span>
              )}
            </div>
          )}
        </div>

        {todo.flagged && (
          <span className="flag-mark" aria-label="Bayraklı">
            <Icon name="flagFill" size={16} />
          </span>
        )}
        {!editing && (
          <>
            <button type="button" className="icon-btn hover-only" onClick={onFlag} aria-label="Bayrak">
              <Icon name="flag" size={18} />
            </button>
            <button type="button" className="icon-btn del hover-only" onClick={onDelete} aria-label="Sil">
              <Icon name="trash" size={18} />
            </button>
            <button type="button" className="icon-btn info" onClick={onInfo} aria-label="Ayrıntılar">
              <Icon name="info" size={20} stroke={1.8} />
            </button>
          </>
        )}
        {sortable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="grip"
            {...attributes}
            aria-label={`Sırala: ${todo.text}`}
          >
            <Icon name="grip" size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
