"use client";

import { useRef, useState } from "react";
import { Sheet, SheetHeader } from "./Sheet";
import { ColorDots, Segmented, Switch } from "./ui";
import { Icon } from "./icons";
import type { usePush } from "@/lib/push-client";
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
  push,
}: {
  open: boolean;
  onClose: () => void;
  push: ReturnType<typeof usePush>;
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
  const [testResult, setTestResult] = useState("");
  const { permission, server, subscription } = push.state;

  const status =
    permission === "unsupported"
      ? "Bu tarayıcı bildirimleri desteklemiyor"
      : permission === "denied"
        ? "Engelli · tarayıcının site ayarlarından izin ver"
        : permission === "default"
          ? "Bildirim izni gerekiyor"
          : server === "checking"
            ? "Kontrol ediliyor…"
            : server === "ready" && subscription
              ? "Açık · uygulama kapalıyken de gelir"
              : "Açık · yalnızca uygulama açıkken";

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

        <p className="group-label">Hatırlatmalar</p>
        <div className="group">
          <div className="cell">
            <span className="cell-icon" style={{ background: "#FF453A" }}>
              <Icon name="bell" size={17} />
            </span>
            <div className="cell-text">
              <span>Hatırlatmalar</span>
              <small>{status}</small>
            </div>
            <Switch
              label="Hatırlatmalar"
              checked={settings.reminders}
              onChange={(reminders) => setSettings({ reminders })}
            />
          </div>
          {permission === "default" && (
            <button type="button" className="cell action" onClick={push.enable}>
              <Icon name="bell" size={19} />
              <span>Bildirimlere izin ver</span>
            </button>
          )}
          {permission === "granted" && (
            <button
              type="button"
              className="cell action"
              onClick={async () => {
                setTestResult("Gönderiliyor…");
                const r = await push.test();
                setTestResult(r === "push" ? "Birkaç saniye içinde gelecek" : r === "local" ? "Gösterildi" : "Gönderilemedi");
              }}
            >
              <Icon name="sparkles" size={19} />
              <span>Test bildirimi gönder</span>
              {testResult && <small className="cell-count">{testResult}</small>}
            </button>
          )}
        </div>
        <p className="foot left">
          Saati olan görevler için hatırlatma, görev ayrıntılarından seçilir.
          {server === "off" && permission === "granted" && " Uygulama kapalıyken bildirim gelmesi için sunucu kurulumu gerekiyor."}
        </p>

        <p className="group-label">Davranış</p>
        <div className="group">
          <div className="cell">
            <div className="cell-text">
              <span>Akıllı ekleme</span>
              <small>“yarın 15:00 toplantı !! #iş” gibi yazınca tarih, saat, öncelik ve liste otomatik ayarlanır</small>
            </div>
            <Switch
              label="Akıllı ekleme"
              checked={settings.smartAdd}
              onChange={(smartAdd) => setSettings({ smartAdd })}
            />
          </div>
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
