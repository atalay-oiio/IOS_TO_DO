"use client";

import { useRef, useState } from "react";
import { Sheet, SheetHeader } from "./Sheet";
import { PaintDots, Segmented, Switch, type PaintOption } from "./ui";
import { Icon } from "./icons";
import type { usePush } from "@/lib/push-client";
import { scheduledSummary } from "@/lib/reminders";
import { PAINTS, paintBackground, resolvePaint } from "@/lib/paint";
import { DELAY_OPTIONS, type LockConfig } from "@/lib/lock";
import { type Settings, type SortMode, type ThemeMode } from "@/lib/types";

const PAINT_OPTIONS: PaintOption[] = PAINTS.map((p) => ({ id: p.id, name: p.name, background: paintBackground(p) }));

// Arka plan: varsayılan (temanın kendi rengi) ve sade seçenekleri + renkler
const BACKGROUND_OPTIONS: PaintOption[] = [
  { id: "theme", name: "Varsayılan", background: "linear-gradient(135deg, var(--blob-1), var(--blob-2))" },
  { id: "plain", name: "Sade", background: "var(--fill-2)" },
  ...PAINT_OPTIONS,
];

// Sunucuda bekleyen hatırlatmalar (kurulduğunu doğrulamak için)
function ScheduledInfo() {
  const s = scheduledSummary();
  const clock = (at: number) =>
    new Date(at).toLocaleString("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="cell">
      <div className="cell-text">
        <span>Zamanlanmış hatırlatmalar</span>
        <small>
          {s.count ? `${s.count} adet · sıradaki ${clock(s.next!)}` : "Şu an bekleyen yok"}
          {s.lastError && ` · son hata: ${s.lastError}`}
        </small>
      </div>
    </div>
  );
}

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
  lock,
}: {
  open: boolean;
  onClose: () => void;
  push: ReturnType<typeof usePush>;
  lock: {
    cfg: LockConfig;
    biometricOk: boolean;
    setup: () => void;
    disable: () => void;
    setDelay: (ms: number) => void;
    toggleBiometric: (on: boolean) => void;
  };
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
          <p className="pad-label">Vurgu rengi · {resolvePaint(settings.accent).name}</p>
          <PaintDots
            label="Vurgu rengi"
            options={PAINT_OPTIONS}
            value={resolvePaint(settings.accent).id}
            onChange={(accent) => setSettings({ accent })}
          />
          <p className="pad-label">
            Arka plan ·{" "}
            {settings.background === "theme"
              ? "Varsayılan"
              : settings.background === "plain"
                ? "Sade"
                : resolvePaint(settings.background).name}
          </p>
          <PaintDots
            label="Arka plan"
            options={BACKGROUND_OPTIONS}
            value={settings.background}
            onChange={(background) => setSettings({ background })}
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
          {open && permission === "granted" && server === "ready" && subscription && <ScheduledInfo />}
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

        <p className="group-label">Güvenlik</p>
        <div className="group">
          <div className="cell">
            <span className="cell-icon" style={{ background: "#5E5CE6" }}>
              <Icon name="lock" size={17} />
            </span>
            <div className="cell-text">
              <span>Uygulama kilidi</span>
              <small>{lock.cfg.enabled ? "Açık · PIN sorulur" : "Kapalı"}</small>
            </div>
            <Switch
              label="Uygulama kilidi"
              checked={lock.cfg.enabled}
              onChange={(on) => (on ? lock.setup() : lock.disable())}
            />
          </div>
          {lock.cfg.enabled && lock.biometricOk && (
            <div className="cell">
              <span className="cell-icon" style={{ background: "#30D158" }}>
                <Icon name="fingerprint" size={17} />
              </span>
              <div className="cell-text">
                <span>Parmak izi ile aç</span>
                <small>Okunmazsa PIN sorulur</small>
              </div>
              <Switch
                label="Parmak izi ile aç"
                checked={!!lock.cfg.credentialId}
                onChange={lock.toggleBiometric}
              />
            </div>
          )}
          {lock.cfg.enabled && (
            <>
              <div className="cell stack">
                <div className="cell-text">
                  <span>Kilitlenme süresi</span>
                  <small>Uygulamadan çıktıktan ne kadar sonra kilitlensin</small>
                </div>
                <Segmented<number>
                  label="Kilitlenme süresi"
                  value={lock.cfg.delay}
                  onChange={lock.setDelay}
                  options={DELAY_OPTIONS}
                />
              </div>
              <button type="button" className="cell action" onClick={lock.setup}>
                <Icon name="pencil" size={19} />
                <span>PIN&apos;i değiştir</span>
              </button>
            </>
          )}
        </div>
        <p className="foot left">
          Kilit ekranı uygulamayı gizler; veriler cihazda şifrelenmez. PIN&apos;i unutursan kilidi kaldırmak için
          tarayıcıdan uygulama verilerini silmen gerekir.
        </p>

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
