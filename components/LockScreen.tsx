"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";
import { haptic } from "@/lib/haptics";
import {
  checkPin,
  lockedFor,
  makePin,
  pinLength,
  pinOutdated,
  verifyBiometric,
  PIN_LENGTH,
  type LockConfig,
  type PinHash,
} from "@/lib/lock";

type Props =
  | { mode: "unlock"; cfg: LockConfig; onUnlock: (upgraded?: PinHash) => void; onFail: () => void }
  | { mode: "set"; cfg: LockConfig; onDone: (pin: PinHash) => void; onCancel: () => void };

// Kalan bekleme: "30 sn" ya da "4:59"
const countdown = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return s < 60 ? `${s} sn` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function LockScreen(props: Props) {
  const { mode, cfg } = props;
  const [entry, setEntry] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [newLength, setNewLength] = useState(PIN_LENGTH);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const length = mode === "unlock" ? pinLength(cfg.pin) : newLength;

  // Çok fazla yanlış denemeden sonra tuşlar bekler; parmak izi yine çalışır
  const wait = mode === "unlock" ? lockedFor(cfg) : 0;
  const waiting = wait > 0;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [waiting]);

  const title = waiting
    ? "Çok fazla yanlış deneme"
    : mode === "unlock"
      ? "Glass Todo"
      : first === null
        ? "Yeni PIN belirle"
        : "PIN'i tekrar gir";
  const hint = mode === "unlock" ? "PIN'i gir" : first === null ? `${length} haneli bir kod seç` : "Aynı kodu tekrar gir";
  const message = waiting ? `${countdown(wait)} sonra tekrar dene` : error || hint;

  const askBiometric = useCallback(async () => {
    if (mode !== "unlock" || !cfg.credentialId || busy) return;
    setBusy(true);
    const ok = await verifyBiometric(cfg.credentialId);
    setBusy(false);
    if (ok) props.onUnlock();
    else setError("Tanınmadı, PIN ile dene");
  }, [mode, cfg.credentialId, busy, props]);

  // Kilit ekranı açılınca parmak izini kendiliğinden sor
  useEffect(() => {
    if (mode === "unlock" && cfg.credentialId) askBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (code: string) => {
    if (mode === "unlock") {
      if (await checkPin(code, cfg.pin)) {
        return props.onUnlock(cfg.pin && pinOutdated(cfg.pin) ? await makePin(code) : undefined);
      }
      props.onFail();
      haptic("error");
      setError("Yanlış PIN");
      setEntry("");
      setBusy(false);
      return;
    }
    if (first === null) {
      setFirst(code);
      setEntry("");
      setError("");
      setBusy(false);
      return;
    }
    if (first !== code) {
      haptic("error");
      setError("Kodlar eşleşmedi");
      setFirst(null);
      setEntry("");
      setBusy(false);
      return;
    }
    props.onDone(await makePin(code));
  };

  const press = (digit: string) => {
    if (busy || waiting || entry.length >= length) return;
    haptic("select");
    const next = entry + digit;
    setEntry(next);
    setError("");
    if (next.length === length) {
      setBusy(true);
      setTimeout(() => submit(next), 120);
    }
  };

  const erase = () => {
    if (!busy && !waiting) setEntry((v) => v.slice(0, -1));
  };

  // Fiziksel klavye desteği (masaüstü)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
      else if (e.key === "Escape" && mode === "set") props.onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label={title}>
      <div className="lock-inner">
        <span className="lock-icon">
          <Icon name="check" size={30} stroke={3} />
        </span>
        <h1>{title}</h1>
        <p className={waiting || error ? "lock-error" : ""} aria-live="polite">
          {message}
        </p>

        <div className={`pin-dots ${error ? "shake" : ""}`} aria-hidden>
          {Array.from({ length }, (_, i) => (
            <span key={i} className={i < entry.length ? "on" : ""} />
          ))}
        </div>

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} type="button" className="key" onClick={() => press(d)} disabled={busy || waiting}>
              {d}
            </button>
          ))}
          {mode === "unlock" && cfg.credentialId ? (
            <button type="button" className="key ghost" onClick={askBiometric} aria-label="Parmak izi ile aç">
              <Icon name="fingerprint" size={26} stroke={1.8} />
            </button>
          ) : mode === "set" ? (
            <button type="button" className="key ghost small" onClick={props.onCancel}>
              Vazgeç
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="key" onClick={() => press("0")} disabled={busy || waiting}>
            0
          </button>
          <button type="button" className="key ghost" onClick={erase} disabled={busy || waiting} aria-label="Sil">
            <Icon name="delete" size={24} stroke={1.8} />
          </button>
        </div>

        {mode === "set" && first === null && (
          <button
            type="button"
            className="lock-option"
            onClick={() => {
              setNewLength((n) => (n === 6 ? 4 : 6));
              setEntry("");
              setError("");
            }}
          >
            PIN seçenekleri · {length === 6 ? "4 haneli kullan" : "6 haneli kullan"}
          </button>
        )}
      </div>
    </div>
  );
}
