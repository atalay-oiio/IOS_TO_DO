"use client";

import { useRef } from "react";
import { Sheet, SheetHeader } from "./Sheet";
import { ColorDots, Segmented, Switch } from "./ui";
import { Icon } from "./icons";
import { ACCENTS, AURORA, type Settings, type SortMode, type ThemeMode } from "@/lib/types";

const AURORA_BG = "linear-gradient(135deg, #7cf8ff, #8b7bff 55%, #ff7ad9)";

export function SettingsSheet({
  open,
  onClose,
  settings,
  setSettings,
  completedCount,
  totalCount,
  onExport,
  onImport,
  onClearCompleted,
  onDeleteAll,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  completedCount: number;
  totalCount: number;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearCompleted: () => void;
  onDeleteAll: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet open={open} onClose={onClose} label="Ayarlar">
      <SheetHeader
        title="Ayarlar"
        right={
          <button type="button" className="nav-btn strong" onClick={onClose}>
            Bitti
          </button>
        }
      />
      <div className="sheet-body">
        <p className="group-label">Görünüm</p>
        <div className="group pad">
          <Segmented<ThemeMode>
            label="Tema"
            value={settings.theme}
            onChange={(theme) => setSettings({ theme })}
            options={[
              { value: "system", label: "Otomatik" },
              { value: "light", label: "Açık" },
              { value: "dark", label: "Koyu" },
            ]}
          />
          <p className="pad-label">Vurgu rengi</p>
          <ColorDots
            label="Vurgu rengi"
            colors={ACCENTS}
            value={settings.accent}
            onChange={(accent) => setSettings({ accent })}
            render={(c) => (c === AURORA ? AURORA_BG : c)}
          />
        </div>

        <p className="group-label">Liste</p>
        <div className="group">
          <div className="cell">
            <div className="cell-text">
              <span>Tamamlananları göster</span>
            </div>
            <Switch
              label="Tamamlananları göster"
              checked={settings.showCompleted}
              onChange={(showCompleted) => setSettings({ showCompleted })}
            />
          </div>
          <div className="cell stack">
            <div className="cell-text">
              <span>Sıralama</span>
            </div>
            <Segmented<SortMode>
              label="Sıralama"
              value={settings.sort}
              onChange={(sort) => setSettings({ sort })}
              options={[
                { value: "manual", label: "Manuel" },
                { value: "due", label: "Tarih" },
                { value: "priority", label: "Öncelik" },
                { value: "title", label: "A–Z" },
              ]}
            />
          </div>
        </div>

        <p className="group-label">Davranış</p>
        <div className="group">
          <div className="cell">
            <div className="cell-text">
              <span>Silmeden önce sor</span>
              <small>Kapalıyken silinen görev “Geri Al” ile geri getirilebilir</small>
            </div>
            <Switch
              label="Silmeden önce sor"
              checked={settings.confirmDelete}
              onChange={(confirmDelete) => setSettings({ confirmDelete })}
            />
          </div>
          <div className="cell">
            <div className="cell-text">
              <span>Kutlama animasyonu</span>
              <small>Tüm görevler bitince konfeti</small>
            </div>
            <Switch
              label="Kutlama animasyonu"
              checked={settings.celebrate}
              onChange={(celebrate) => setSettings({ celebrate })}
            />
          </div>
        </div>

        <p className="group-label">Veriler</p>
        <div className="group">
          <button type="button" className="cell action" onClick={onExport} disabled={totalCount === 0}>
            <Icon name="download" size={19} />
            <span>Yedeği dışa aktar</span>
          </button>
          <button type="button" className="cell action" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={19} />
            <span>Yedekten geri yükle</span>
          </button>
          <button
            type="button"
            className="cell action"
            onClick={onClearCompleted}
            disabled={completedCount === 0}
          >
            <Icon name="checkCircle" size={19} />
            <span>Tamamlananları temizle</span>
            <small className="cell-count">{completedCount}</small>
          </button>
          <button
            type="button"
            className="cell action destructive"
            onClick={onDeleteAll}
            disabled={totalCount === 0}
          >
            <Icon name="trash" size={19} />
            <span>Tüm görevleri sil</span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = "";
          }}
        />
        <p className="foot">Glass Todo · Verilerin yalnızca bu cihazda saklanır.</p>
      </div>
    </Sheet>
  );
}
