"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetHeader } from "./Sheet";
import { ColorDots } from "./ui";
import { Icon } from "./icons";
import { COLORS, newId, type TodoList } from "@/lib/types";

export function ListsSheet({
  open,
  onClose,
  lists,
  counts,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  lists: TodoList[];
  counts: Record<string, number>;
  onSave: (list: TodoList) => void;
  onDelete: (list: TodoList) => void;
}) {
  const [draft, setDraft] = useState<TodoList | null>(null);

  useEffect(() => {
    if (!open) setDraft(null);
  }, [open]);

  const isNew = draft && !lists.some((l) => l.id === draft.id);

  const commit = () => {
    if (draft?.name.trim()) onSave({ ...draft, name: draft.name.trim() });
    setDraft(null);
  };

  const editor = draft && (
    <div className="list-editor">
      <input
        className="field title"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(null);
          }
        }}
        placeholder="Liste adı"
        aria-label="Liste adı"
        autoFocus
      />
      <ColorDots
        label="Liste rengi"
        colors={COLORS}
        value={draft.color}
        onChange={(color) => setDraft({ ...draft, color })}
      />
      <div className="editor-actions">
        <button type="button" className="btn default" onClick={() => setDraft(null)}>
          Vazgeç
        </button>
        <button type="button" className="btn primary" onClick={commit} disabled={!draft.name.trim()}>
          {isNew ? "Oluştur" : "Kaydet"}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} label="Listeler">
      <SheetHeader
        title="Listeler"
        left={
          <button
            type="button"
            className="nav-btn"
            onClick={() => setDraft({ id: newId(), name: "", color: COLORS[(lists.length * 3) % COLORS.length] })}
            disabled={!!draft}
          >
            <Icon name="plus" size={18} /> Yeni
          </button>
        }
        right={
          <button type="button" className="nav-btn strong" onClick={onClose}>
            Bitti
          </button>
        }
      />
      <div className="sheet-body">
        {isNew && <div className="group pad">{editor}</div>}
        <div className="group">
          {lists.map((l) =>
            draft?.id === l.id ? (
              <div key={l.id} className="cell stack">
                {editor}
              </div>
            ) : (
              <div key={l.id} className="cell">
                <span className="list-badge" style={{ background: l.color }}>
                  <Icon name="list" size={16} />
                </span>
                <button type="button" className="cell-text as-btn" onClick={() => setDraft(l)}>
                  <span>{l.name}</span>
                  <small>{counts[l.id] ?? 0} görev</small>
                </button>
                <button type="button" className="icon-btn" aria-label={`${l.name} düzenle`} onClick={() => setDraft(l)}>
                  <Icon name="pencil" size={17} />
                </button>
                <button
                  type="button"
                  className="icon-btn del"
                  aria-label={`${l.name} sil`}
                  onClick={() => onDelete(l)}
                  disabled={lists.length <= 1}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            )
          )}
        </div>
        <p className="foot">Bir listeyi silmek içindeki görevleri de siler. En az bir liste kalmalıdır.</p>
      </div>
    </Sheet>
  );
}
