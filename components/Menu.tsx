"use client";

import { Icon, type IconName } from "./icons";
import { useLayer } from "./Sheet";

export type MenuItem =
  | {
      label: string;
      icon?: IconName;
      onClick: () => void;
      checked?: boolean;
      destructive?: boolean;
      disabled?: boolean;
    }
  | { section: string }
  | "sep";

// iOS 26 tarzı açılır menü (ebeveyn `position: relative` olmalı)
export function Menu({ open, onClose, items }: { open: boolean; onClose: () => void; items: MenuItem[] }) {
  useLayer(open, onClose, false);
  if (!open) return null;
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <div className="menu material" role="menu">
        {items.map((item, i) => {
          if (item === "sep") return <div key={i} className="menu-sep" role="separator" />;
          if ("section" in item)
            return (
              <p key={i} className="menu-section">
                {item.section}
              </p>
            );
          return (
            <button
              key={i}
              type="button"
              role={item.checked === undefined ? "menuitem" : "menuitemradio"}
              aria-checked={item.checked}
              className={`menu-item ${item.destructive ? "destructive" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick();
              }}
            >
              <span className="menu-check">{item.checked && <Icon name="check" size={15} stroke={2.6} />}</span>
              <span className="menu-label">{item.label}</span>
              {item.icon && <Icon name={item.icon} size={18} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
