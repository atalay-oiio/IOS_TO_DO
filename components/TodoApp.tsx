"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "./dnd";
import { TaskRow } from "./TaskRow";
import { TaskSheet } from "./TaskSheet";
import { SettingsSheet } from "./SettingsSheet";
import { ListsSheet } from "./ListsSheet";
import { Alert, type AlertAction } from "./Sheet";
import { Menu, type MenuItem } from "./Menu";
import { Icon, type IconName } from "./icons";
import { Confetti, ProgressRing } from "./Decor";
import { dueGroup, headerDate, isOverdue, todayKey } from "@/lib/date";
import { makeTodo, normalizeData, useApplyTheme, useTodoStore } from "@/lib/store";
import { VIEW_TITLES, type SortMode, type Todo, type TodoList, type View } from "@/lib/types";

type AlertState = { title: string; message?: ReactNode; actions: AlertAction[] };
type Toast = { id: number; text: string; undo?: () => void };

const TABS: { view: View; icon: IconName }[] = [
  { view: "today", icon: "sun" },
  { view: "planned", icon: "calendar" },
  { view: "all", icon: "tray" },
  { view: "flagged", icon: "flag" },
];

const SORT_LABELS: Record<SortMode, string> = { manual: "Manuel", due: "Tarih", priority: "Öncelik", title: "Başlık" };
const GROUP_ORDER = ["Gecikmiş", "Bugün", "Yarın", "Bu Hafta", "Bu Ay", "Daha Sonra"];

const fold = (s: string) => s.toLocaleLowerCase("tr");

export default function TodoApp() {
  const store = useTodoStore();
  const { loaded, todos, lists, settings, setSettings } = store;
  useApplyTheme(settings, loaded);

  const [view, setView] = useState<View>("all");
  const [listFilter, setListFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; todo: Todo | null }>({ open: false, todo: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; data: AlertState | null }>({ open: false, data: null });
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [, setTick] = useState(0);

  // Gecikmiş/bugün etiketleri güncel kalsın
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    const onVis = () => document.visibilityState === "visible" && setTick((t) => t + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const today = todayKey();

  // ---------- Türetilmiş veriler ----------
  const inList = (t: Todo) => !listFilter || t.listId === listFilter;
  const inView = (t: Todo, v: View) =>
    v === "today" ? !!t.due && t.due <= today : v === "planned" ? !!t.due : v === "flagged" ? t.flagged : true;

  const scope = todos.filter((t) => inList(t) && inView(t, view));
  const q = fold(query.trim());
  const visible = q
    ? scope.filter(
        (t) =>
          fold(t.text).includes(q) || fold(t.notes).includes(q) || t.subtasks.some((s) => fold(s.text).includes(q))
      )
    : scope;

  const sortMode: SortMode = view === "planned" ? "due" : settings.sort;
  const sorted = sortTodos(visible, sortMode);
  const active = sorted.filter((t) => !t.done);
  const completed = visible.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const sortable = sortMode === "manual" && !q;

  const doneCount = scope.filter((t) => t.done).length;
  const percent = scope.length === 0 ? 0 : Math.round((doneCount / scope.length) * 100);

  const pending = todos.filter((t) => !t.done && inList(t));
  const counts: Record<View, number> = {
    today: pending.filter((t) => inView(t, "today")).length,
    planned: pending.filter((t) => inView(t, "planned")).length,
    all: pending.length,
    flagged: pending.filter((t) => t.flagged).length,
  };
  const overdueCount = pending.filter((t) => isOverdue(t.due, t.time)).length;
  const listCounts = todos.reduce<Record<string, number>>((acc, t) => {
    if (!t.done) acc[t.listId] = (acc[t.listId] ?? 0) + 1;
    return acc;
  }, {});

  const defaultListId = listFilter ?? lists[0]?.id ?? "";
  const defaults = {
    listId: defaultListId,
    due: view === "today" || view === "planned" ? today : undefined,
    flagged: view === "flagged",
  };

  // ---------- Eylemler ----------
  const openAlert = (data: AlertState) => setAlert({ open: true, data });
  const closeAlert = () => setAlert((a) => ({ ...a, open: false }));
  const notify = (text: string, undo?: () => void) => setToast({ id: Date.now(), text, undo });

  const addQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    store.add(makeTodo({ text, ...defaults }));
    setInput("");
  };

  const toggle = (id: string) => {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    store.toggle(id);
    // Kapsamdaki son görev tamamlanınca kutla
    if (!t.done && settings.celebrate && scope.some((x) => x.id === id)) {
      const remaining = scope.filter((x) => !x.done && x.id !== id).length;
      if (remaining === 0) setTimeout(() => setCelebrate(true), 450);
    }
  };

  const deleteNow = (id: string) => {
    const index = todos.findIndex((t) => t.id === id);
    const todo = todos[index];
    if (!todo) return;
    store.remove(id);
    notify(`“${todo.text}” silindi`, () => store.restore(todo, index));
  };

  const requestDelete = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (!settings.confirmDelete) return deleteNow(id);
    openAlert({
      title: "Görevi sil?",
      message: (
        <>
          <strong>“{todo.text}”</strong> görevi silinecek.
        </>
      ),
      actions: [
        { label: "Vazgeç", style: "cancel", onClick: closeAlert },
        {
          label: "Sil",
          style: "destructive",
          onClick: () => {
            closeAlert();
            deleteNow(id);
          },
        },
      ],
    });
  };

  // Birden fazla görevi sil, geri alınabilir
  const removeWithUndo = (items: Todo[], text: string) => {
    const snapshot = items
      .map((t) => ({ todo: t, index: todos.findIndex((x) => x.id === t.id) }))
      .sort((a, b) => a.index - b.index);
    store.removeMany(new Set(items.map((t) => t.id)));
    notify(text, () => snapshot.forEach(({ todo, index }) => store.restore(todo, index)));
  };

  const clearCompleted = (items: Todo[]) => {
    if (items.length === 0) return;
    openAlert({
      title: "Tamamlananları temizle?",
      message: `${items.length} tamamlanmış görev silinecek.`,
      actions: [
        { label: "Vazgeç", style: "cancel", onClick: closeAlert },
        {
          label: "Temizle",
          style: "destructive",
          onClick: () => {
            closeAlert();
            removeWithUndo(items, `${items.length} görev temizlendi`);
          },
        },
      ],
    });
  };

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ app: "glass-todo", version: 2, exportedAt: new Date().toISOString(), todos, lists }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glass-todo-yedek-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = async (file: File) => {
    let data: ReturnType<typeof normalizeData> = null;
    try {
      data = normalizeData(JSON.parse(await file.text()));
    } catch {}
    if (!data) return notify("Dosya okunamadı: geçerli bir yedek değil");
    const next = data;
    openAlert({
      title: "Yedek geri yüklensin mi?",
      message: `Mevcut ${todos.length} görev, yedekteki ${next.todos.length} görev ve ${next.lists.length} listeyle değiştirilecek.`,
      actions: [
        { label: "Vazgeç", style: "cancel", onClick: closeAlert },
        {
          label: "Geri Yükle",
          style: "primary",
          onClick: () => {
            closeAlert();
            setSettingsOpen(false);
            store.replaceAll(next);
            setListFilter(null);
            notify("Yedek geri yüklendi");
          },
        },
      ],
    });
  };

  const deleteList = (list: TodoList) => {
    const n = todos.filter((t) => t.listId === list.id).length;
    openAlert({
      title: `“${list.name}” silinsin mi?`,
      message: n > 0 ? `Bu listedeki ${n} görev de silinecek.` : "Liste boş.",
      actions: [
        { label: "Vazgeç", style: "cancel", onClick: closeAlert },
        {
          label: "Sil",
          style: "destructive",
          onClick: () => {
            closeAlert();
            store.removeList(list.id);
            if (listFilter === list.id) setListFilter(null);
          },
        },
      ],
    });
  };

  const openNew = () => setTaskSheet({ open: true, todo: null });
  const openSearch = () => {
    setSearchOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Klavye kısayolları: N = yeni görev, / = ara
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, [role=dialog], [role=alertdialog]")) return;
      if (document.documentElement.classList.contains("locked")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setTaskSheet({ open: true, todo: null });
      } else if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    if (over && a.id !== over.id) store.reorder(String(a.id), String(over.id));
  };

  const menuItems: MenuItem[] = [
    { section: "Sıralama" },
    ...(Object.keys(SORT_LABELS) as SortMode[]).map((s) => ({
      label: SORT_LABELS[s],
      checked: settings.sort === s,
      disabled: view === "planned",
      onClick: () => setSettings({ sort: s }),
    })),
    "sep",
    {
      label: settings.showCompleted ? "Tamamlananları Gizle" : "Tamamlananları Göster",
      icon: settings.showCompleted ? "eyeOff" : "eye",
      onClick: () => setSettings({ showCompleted: !settings.showCompleted }),
    },
    {
      label: "Tamamlananları Temizle",
      icon: "checkCircle",
      disabled: doneCount === 0,
      onClick: () => clearCompleted(scope.filter((t) => t.done)),
    },
    "sep",
    { label: "Listeleri Düzenle", icon: "list", onClick: () => setListsOpen(true) },
    { label: "Ayarlar", icon: "sliders", onClick: () => setSettingsOpen(true) },
  ];

  if (!loaded) return <main className="shell" aria-busy="true" />;

  const title = VIEW_TITLES[view];
  const renderRow = (t: Todo, canSort: boolean) => (
    <TaskRow
      key={t.id}
      todo={t}
      list={listById.get(t.listId)}
      showList={!listFilter && lists.length > 1}
      sortable={canSort}
      editing={editingId === t.id}
      onToggle={() => toggle(t.id)}
      onEdit={() => setEditingId(t.id)}
      onSave={(text) => {
        const clean = text.trim();
        if (clean && clean !== t.text) store.update(t.id, { text: clean });
        setEditingId(null);
      }}
      onCancel={() => setEditingId(null)}
      onInfo={() => setTaskSheet({ open: true, todo: t })}
      onFlag={() => store.update(t.id, { flagged: !t.flagged })}
      onDelete={() => requestDelete(t.id)}
    />
  );

  const plannedGroups =
    view === "planned"
      ? GROUP_ORDER.map((g) => ({ name: g, items: active.filter((t) => t.due && dueGroup(t.due) === g) })).filter(
          (g) => g.items.length > 0
        )
      : [];

  return (
    <main className="shell">
      {/* Kompakt üst çubuk (kaydırınca görünür) */}
      <div className={`topbar ${scrolled ? "scrolled" : ""}`}>
        <span className="topbar-title">{title}</span>
        <div className="topbar-actions">
          <button type="button" className="glass-btn" onClick={openSearch} aria-label="Ara">
            <Icon name="search" size={19} />
          </button>
          <div className="menu-anchor">
            <button
              type="button"
              className="glass-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Seçenekler"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Icon name="more" size={20} />
            </button>
            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} />
          </div>
        </div>
      </div>

      <header className="large-title">
        <p className="eyebrow">{headerDate()}</p>
        <h1>{title}</h1>
      </header>

      {searchOpen && (
        <div className="search material">
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
              }
            }}
            placeholder="Görevlerde ara"
            aria-label="Görevlerde ara"
            enterKeyHint="search"
          />
          <button
            type="button"
            className="nav-btn"
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
          >
            Vazgeç
          </button>
        </div>
      )}

      <section className="summary material">
        <ProgressRing percent={percent} />
        <div className="summary-text">
          <p className="summary-title">
            {scope.length === 0 ? "Görev yok" : `${doneCount} / ${scope.length} tamamlandı`}
          </p>
          <p className="summary-sub">
            {scope.length === 0
              ? "Yeni bir görev ekleyerek başla"
              : percent === 100
                ? "Hepsi bitti, harika iş!"
                : `${scope.length - doneCount} görev kaldı`}
          </p>
          <div className="stats">
            <button type="button" className="stat red" onClick={() => setView("today")}>
              <b>{overdueCount}</b>Gecikmiş
            </button>
            <button type="button" className="stat blue" onClick={() => setView("today")}>
              <b>{counts.today}</b>Bugün
            </button>
            <button type="button" className="stat orange" onClick={() => setView("flagged")}>
              <b>{counts.flagged}</b>Bayraklı
            </button>
          </div>
        </div>
      </section>

      <nav className="chips scroll" aria-label="Listeler">
        <button type="button" className={`chip ${!listFilter ? "on" : ""}`} onClick={() => setListFilter(null)}>
          Tüm listeler
        </button>
        {lists.map((l) => (
          <button
            type="button"
            key={l.id}
            className={`chip ${listFilter === l.id ? "on" : ""}`}
            onClick={() => setListFilter(listFilter === l.id ? null : l.id)}
          >
            <i className="dot" style={{ background: l.color }} />
            {l.name}
            {listCounts[l.id] ? <small>{listCounts[l.id]}</small> : null}
          </button>
        ))}
        <button type="button" className="chip ghost" onClick={() => setListsOpen(true)} aria-label="Listeleri düzenle">
          <Icon name="pencil" size={15} />
        </button>
      </nav>

      <form className="add material" onSubmit={addQuick}>
        <span className="add-circle" style={{ borderColor: listById.get(defaultListId)?.color }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${listById.get(defaultListId)?.name ?? ""} listesine ekle…`}
          aria-label="Yeni görev"
          enterKeyHint="done"
        />
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            setTaskSheet({ open: true, todo: null });
          }}
          aria-label="Ayrıntılı ekle"
        >
          <Icon name="sliders" size={19} />
        </button>
        <button type="submit" className="add-btn" aria-label="Ekle" disabled={!input.trim()}>
          <Icon name="plus" size={20} stroke={2.6} />
        </button>
      </form>

      {active.length > 1 && sortable && (
        <p className="hint">
          <span className="touch-only">Sıralamak için basılı tut · İşlemler için sola kaydır</span>
          <span className="mouse-only">Sıralamak için sürükle · Düzenlemek için metne tıkla · N: yeni görev</span>
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        {view === "planned" ? (
          plannedGroups.map((g) => (
            <section key={g.name} className="section">
              <h3 className={`section-title ${g.name === "Gecikmiş" ? "red" : ""}`}>{g.name}</h3>
              <ul className="group-list material">{g.items.map((t) => renderRow(t, false))}</ul>
            </section>
          ))
        ) : active.length > 0 ? (
          <SortableContext items={active.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="group-list material">{active.map((t) => renderRow(t, sortable))}</ul>
          </SortableContext>
        ) : null}
      </DndContext>

      {visible.length === 0 && (
        <div className="empty material">
          <span className="empty-icon">
            <Icon name={q ? "search" : "sparkles"} size={30} stroke={1.6} />
          </span>
          <p className="empty-title">{q ? "Sonuç bulunamadı" : emptyTitle(view)}</p>
          <p>{q ? `“${query.trim()}” için eşleşen görev yok.` : "Yukarıdan ya da + ile yeni görev ekle."}</p>
        </div>
      )}

      {active.length === 0 && completed.length > 0 && !q && (
        <div className="all-done">
          <Icon name="checkCircle" size={18} /> Buradaki tüm görevler tamamlandı
        </div>
      )}

      {settings.showCompleted && completed.length > 0 && (
        <section className="section">
          <div className="section-head">
            <button type="button" className="section-toggle" onClick={() => setCompletedOpen((o) => !o)}>
              <span className={`chev ${completedOpen ? "open" : ""}`}>
                <Icon name="chevronRight" size={15} stroke={2.4} />
              </span>
              Tamamlanan <small>{completed.length}</small>
            </button>
            <button type="button" className="nav-btn small" onClick={() => clearCompleted(completed)}>
              Temizle
            </button>
          </div>
          {completedOpen && <ul className="group-list material">{completed.map((t) => renderRow(t, false))}</ul>}
        </section>
      )}

      <div className="bottom-spacer" />

      {/* iOS 26 yüzen sekme çubuğu + ayrık ekleme butonu */}
      <div className="dock">
        <nav className="tabbar material" aria-label="Görünümler">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.view}
              className={`tab ${view === tab.view ? "on" : ""}`}
              onClick={() => {
                setView(tab.view);
                setEditingId(null);
              }}
              aria-current={view === tab.view ? "page" : undefined}
            >
              <span className="tab-icon">
                <Icon name={view === tab.view && tab.view === "flagged" ? "flagFill" : tab.icon} size={21} />
                {counts[tab.view] > 0 && <i className="badge">{counts[tab.view]}</i>}
              </span>
              <span className="tab-label">{VIEW_TITLES[tab.view]}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="fab" onClick={openNew} aria-label="Yeni görev">
          <Icon name="plus" size={26} stroke={2.4} />
        </button>
      </div>

      {toast && (
        <div className="toast material" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Geri Al
            </button>
          )}
        </div>
      )}

      <TaskSheet
        open={taskSheet.open}
        todo={taskSheet.todo}
        onClose={() => setTaskSheet((s) => ({ ...s, open: false }))}
        defaults={defaults}
        lists={lists}
        onSave={(t) => (taskSheet.todo ? store.update(t.id, t) : store.add(t))}
        onDelete={requestDelete}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        completedCount={todos.filter((t) => t.done).length}
        totalCount={todos.length}
        onExport={exportData}
        onImport={importData}
        onClearCompleted={() => clearCompleted(todos.filter((t) => t.done))}
        onDeleteAll={() =>
          openAlert({
            title: "Tüm görevler silinsin mi?",
            message: `${todos.length} görevin hepsi silinecek. Listelerin korunur.`,
            actions: [
              { label: "Vazgeç", style: "cancel", onClick: closeAlert },
              {
                label: "Hepsini Sil",
                style: "destructive",
                onClick: () => {
                  closeAlert();
                  removeWithUndo(todos, "Tüm görevler silindi");
                },
              },
            ],
          })
        }
      />

      <ListsSheet
        open={listsOpen}
        onClose={() => setListsOpen(false)}
        lists={lists}
        counts={listCounts}
        onSave={store.saveList}
        onDelete={deleteList}
      />

      <Alert
        open={alert.open}
        onClose={closeAlert}
        title={alert.data?.title ?? ""}
        message={alert.data?.message}
        actions={alert.data?.actions ?? []}
      />

      <Alert
        open={celebrate}
        onClose={() => setCelebrate(false)}
        icon={<span className="trophy">🎉</span>}
        title="Tebrikler!"
        message={celebrateMessage(view, listFilter ? listById.get(listFilter)?.name : undefined)}
        actions={[
          {
            label: "Yeniden Başla",
            style: "primary",
            onClick: () => {
              store.setDone(new Set(scope.map((t) => t.id)), false);
              setCelebrate(false);
            },
          },
          {
            label: "Tamamlananları Temizle",
            onClick: () => {
              setCelebrate(false);
              removeWithUndo(scope.filter((t) => t.done), "Tamamlananlar temizlendi");
            },
          },
          { label: "Kapat", style: "cancel", onClick: () => setCelebrate(false) },
        ]}
      >
        <Confetti />
      </Alert>
    </main>
  );
}

function sortTodos(items: Todo[], mode: SortMode) {
  if (mode === "manual") return items;
  const copy = [...items];
  if (mode === "due")
    copy.sort((a, b) =>
      `${a.due ?? "9999"}${a.time ?? "99"}`.localeCompare(`${b.due ?? "9999"}${b.time ?? "99"}`)
    );
  if (mode === "priority") copy.sort((a, b) => b.priority - a.priority || Number(b.flagged) - Number(a.flagged));
  if (mode === "title") copy.sort((a, b) => a.text.localeCompare(b.text, "tr"));
  return copy;
}

function celebrateMessage(view: View, listName?: string) {
  const what = { all: "bütün", today: "bugünkü tüm", planned: "planlanan tüm", flagged: "bayraklı tüm" }[view];
  const text = `${listName ? `${listName} listesindeki ` : ""}${what} görevleri tamamladın. Harika iş çıkardın!`;
  return text.charAt(0).toLocaleUpperCase("tr") + text.slice(1);
}

function emptyTitle(view: View) {
  if (view === "today") return "Bugün için görev yok";
  if (view === "planned") return "Planlanmış görev yok";
  if (view === "flagged") return "Bayraklı görev yok";
  return "Listen boş";
}
