import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTheme } from '../hooks/useTheme';
import { exportAllData, importAllData } from '../storage/indexeddb/db';
import { useRef, useState } from 'react';
import type { ThemeMode } from '../services/settingsService';
import './SettingsPage.css';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟系統' },
];

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hk-mahjong-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('已匯出備份檔案。');
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      setStatus('已匯入備份，資料已更新。');
    } catch {
      setStatus('匯入失敗，請確認檔案格式正確。');
    }
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>設定</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="mj-content">
        <section className="mj-settings-section">
          <span className="mj-eyebrow">外觀</span>
          <div className="mj-tile mj-segment">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={mode === opt.value ? 'mj-segment-btn active' : 'mj-segment-btn'}
                onClick={() => setMode(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mj-settings-section">
          <span className="mj-eyebrow">資料</span>
          <div className="mj-tile mj-settings-list">
            <button className="mj-settings-row" onClick={handleExport}>
              <span>匯出所有資料</span>
              <span className="mj-chevron">›</span>
            </button>
            <button className="mj-settings-row" onClick={() => fileInputRef.current?.click()}>
              <span>從備份匯入</span>
              <span className="mj-chevron">›</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>
          {status && <p className="mj-status">{status}</p>}
        </section>

        <section className="mj-settings-section">
          <span className="mj-eyebrow">規則同語言</span>
          <div className="mj-tile mj-settings-list">
            <div className="mj-settings-row mj-settings-row-static">
              <span>規則庫</span>
              <span className="mj-muted">香港正規（第二階段開放自訂）</span>
            </div>
            <div className="mj-settings-row mj-settings-row-static">
              <span>語言</span>
              <span className="mj-muted">繁體中文</span>
            </div>
          </div>
        </section>

        <p className="mj-footnote">所有資料只存喺呢部裝置嘅 IndexedDB，唔會上傳任何伺服器。</p>
      </IonContent>
    </IonPage>
  );
}
