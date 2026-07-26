import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import EmptyState from '../components/EmptyState';
import type { Player, StatisticsSnapshot } from '../storage/indexeddb/db';
import { listStatistics } from '../services/statisticsService';
import { listPlayers } from '../services/playerService';
import './StatisticsPage.css';

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsSnapshot[] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    Promise.all([listStatistics(), listPlayers()]).then(([s, p]) => {
      setStats(s);
      setPlayers(p);
    });
  }, []);

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const withHands = (stats ?? []).filter((s) => s.gamesPlayed > 0);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>統計</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="mj-content">
        {stats === null && <p className="mj-loading">載入緊…</p>}

        {stats !== null && withHands.length === 0 && (
          <EmptyState
            eyebrow="數據累積中"
            title="打多幾局先有統計睇"
            body="勝率、平均番數、自摸率等等，會喺你有牌局紀錄之後自動計算。"
          />
        )}

        {stats !== null && withHands.length > 0 && (
          <div className="mj-stats-list">
            {withHands.map((s) => (
              <div key={s.id} className="mj-tile mj-stats-card">
                <h3>{playerName(s.id)}</h3>
                <div className="mj-stats-grid">
                  <div className="mj-stat">
                    <span className="mj-stat-value">{s.gamesPlayed}</span>
                    <span className="mj-stat-label">牌局</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">{s.handsWon}</span>
                    <span className="mj-stat-label">食糊次數</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">{pct(s.handsWon, s.gamesPlayed)}</span>
                    <span className="mj-stat-label">場均食糊率</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">
                      {s.handsWon > 0 ? (s.totalFan / s.handsWon).toFixed(1) : '—'}
                    </span>
                    <span className="mj-stat-label">平均番數</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">{s.highestFan}</span>
                    <span className="mj-stat-label">最高番數</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">{pct(s.selfDrawCount, s.handsWon)}</span>
                    <span className="mj-stat-label">自摸率</span>
                  </div>
                  <div className="mj-stat">
                    <span className="mj-stat-value">{s.discardLossCount}</span>
                    <span className="mj-stat-label">出銃次數</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
