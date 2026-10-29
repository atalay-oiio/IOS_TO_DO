"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Açık katmanlar yığını: Escape ve Android geri hareketi yalnızca en üsttekini kapatır.
// Geri hareketi uygulamadan çıkmak yerine katmanı kapatsın diye geçmişte TEK bir kayıt tutulur
// ("en az bir katman açık"). Kayıt, değişikliklerin sonunda (mikro görevde) eşitlenir: biri kapanıp
// diğeri aynı anda açılınca (menü → Ayarlar) geri/ileri yapılmaz. Eskiden her katman kendi kaydını
// ekleyip siliyordu; Chrome geri hedefini çağrı anında hesapladığı için bu durumda kayıt kayıyor ve
// ardından basılan "Bitti" uygulamanın dışına çıkıyordu.
const stack: (() => void)[] = [];
let locks = 0;
let hasEntry = false; // geçmişte katmanlar için kayıt var mı
let backPending = false; // kendi history.back()'imizin popstate'i bekleniyor
let syncQueued = false;
let listening = false;

function sync() {
  syncQueued = false;
  if (backPending) return; // geri tamamlanınca (popstate) tekrar eşitlenir
  if (stack.length > 0 && !hasEntry) {
    history.pushState({ glassLayer: true }, "");
    hasEntry = true;
  } else if (stack.length === 0 && hasEntry) {
    hasEntry = false;
    backPending = true;
    history.back();
  }
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(sync);
}

function onPopState() {
  if (backPending) {
    backPending = false;
    queueSync();
    return;
  }
  if (!hasEntry) return;
  // Geri hareketi kaydı tüketti: en üstteki katmanı kapat (alttakiler için yeni kayıt sync'te eklenir)
  hasEntry = false;
  stack[stack.length - 1]?.();
}

export function useLayer(open: boolean, onClose: () => void, lock = true) {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!open) return;
    const close = () => ref.current();
    stack.push(close);
    if (lock && ++locks === 1) document.documentElement.classList.add("locked");
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    queueSync();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === close) {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(close), 1);
      if (lock && --locks === 0) document.documentElement.classList.remove("locked");
      queueSync();
    };
  }, [open, lock]);
}

// Kapanış animasyonu bitene kadar DOM'da tut
function usePresence(open: boolean, ms = 280) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { render, closing };
}

export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const { render, closing } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  useLayer(open, onClose);

  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
  }, [open]);

  if (!render) return null;

  // Tutamaçtan aşağı sürükleyerek kapat
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea, select")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panel.current?.classList.add("dragging");
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    panel.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    panel.current.classList.remove("dragging");
    const velocity = d.dy / (performance.now() - d.t);
    if (d.dy > 140 || (d.dy > 40 && velocity > 0.6)) onClose();
    else panel.current.style.transform = "";
  };

  return (
    <div className={`layer ${closing ? "closing" : ""}`}>
      <div className="scrim" onClick={onClose} />
      <div
        ref={panel}
        className="sheet material"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <div
          className="sheet-drag"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="grabber" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="sheet-header">
      <div className="sh-side">{left}</div>
      <h2>{title}</h2>
      <div className="sh-side end">{right}</div>
    </div>
  );
}

export type AlertAction = {
  label: string;
  style?: "default" | "cancel" | "destructive" | "primary";
  onClick: () => void;
};

export function Alert({
  open,
  onClose,
  title,
  message,
  icon,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  icon?: ReactNode;
  actions: AlertAction[];
  children?: ReactNode;
}) {
  const { render, closing } = usePresence(open, 220);
  useLayer(open, onClose);
  if (!render) return null;
  return (
    <div className={`layer center ${closing ? "closing" : ""}`}>
      <div className="scrim" onClick={onClose} />
      {children}
      <div className="alert material" role="alertdialog" aria-modal="true" aria-label={title}>
        {icon && <div className="alert-icon">{icon}</div>}
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        <div className={`alert-actions ${actions.length > 2 ? "stack" : ""}`}>
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              className={`btn ${a.style ?? "default"}`}
              onClick={a.onClick}
              autoFocus={i === 0}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
