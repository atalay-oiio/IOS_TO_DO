"use client";

import type { CSSProperties, ReactNode } from "react";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
    </button>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={label}
      style={{ "--n": options.length, "--i": index } as CSSProperties}
    >
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type PaintOption = { id: string; name: string; background: string };

export function PaintDots({
  options,
  value,
  onChange,
  label,
}: {
  options: PaintOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="color-dots" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          aria-label={o.name}
          title={o.name}
          className={`color-dot ${o.id === value ? "on" : ""}`}
          style={{ background: o.background }}
          onClick={() => onChange(o.id)}
        />
      ))}
    </div>
  );
}
