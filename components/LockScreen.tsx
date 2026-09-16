"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";
import { checkPin, makePin, verifyBiometric, PIN_LENGTH, type LockConfig } from "@/lib/lock";

type Props =
  | { mode: "unlock"; cfg: LockConfig; onUnlock: () => void }
  | { mode: "set"; cfg: LockConfig; onDone: (pin: LockConfig["pin"]) => void; onCancel: () => void };

export function LockScreen(props: Props) {
  const { mode, cfg } = props;
  const [entry, setEntry] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title =
    mode === "unlock" ? "Glass Todo" : first === null ? "Yeni PIN belirle" : "PIN'i tekrar gir";
  const hint = mode === "unlock" ? "PIN'i gir" : first === null ? `${PIN_LENGTH} haneli bir kod seç` : "Aynı kodu tekrar gir";

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

  const submit = useCallback(
    async (code: string) => {
      if (mode === "unlock") {
        if (await checkPin(code, cfg.pin)) return props.onUnlock();
        setError("Yanlış PIN");
        setEntry("");
        return;
      }
      if (first === null) {
        setFirst(code);
        setEntry("");
        setError("");
        return;
      }
      if (first !== code) {
        setError("Kodlar eşleşmedi");
        setFirst(null);
        setEntry("");
        return;
      }
      props.onDone(await makePin(code));
    },
    [mode, cfg.pin, first, props]
  );

  const press = (digit: string) => {
    if (entry.length >= PIN_LENGTH) return;
    const next = entry + digit;
    setEntry(next);
    setError("");
    if (next.length === PIN_LENGTH) setTimeout(() => submit(next), 120);
  };

  // Fiziksel klavye desteği (masaüstü)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setEntry((v) => v.slice(0, -1));
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
        <p className={error ? "lock-error" : ""}>{error || hint}</p>

        <div className={`pin-dots ${error ? "shake" : ""}`} aria-hidden>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span key={i} className={i < entry.length ? "on" : ""} />
          ))}
        </div>

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} type="button" className="key" onClick={() => press(d)}>
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
          <button type="button" className="key" onClick={() => press("0")}>
            0
          </button>
          <button
            type="button"
            className="key ghost"
            onClick={() => setEntry((v) => v.slice(0, -1))}
            aria-label="Sil"
          >
            <Icon name="delete" size={24} stroke={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
