import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import EmptyState from '../components/EmptyState';
import type { Hand, Player } from '../storage/indexeddb/db';
import { listAllHands } from '../services/gameService';
import { listPlayers } from '../services/playerService';
import { tileLabel, type Tile } from '../rule-engine/tiles';
import type { Meld } from '../rule-engine/hand';
import './HistoryPage.css';

function parseJsonList<T>(stored: string[]): T[] {
  return stored
    .map((s) => {
      try {
        return JSON.parse(s) as T;
      } catch {
        return null;
      }
    })
    .filter((t): t is T => t !== null);
}

function meldLabel(meld: Meld): string {
  const tiles = meld.tiles.map(tileLabel);
  if (meld.type === 'chow') return `上${tiles.join('')}`;
  if (meld.type === 'kong') return `${meld.concealed ? '暗' : '明'}槓${tiles[0]}`;
  return `碰${tiles[0]}`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const [hands, setHands] = useState<Hand[] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    Promise.all([listAllHands(), listPlayers()]).then(([h, p]) => {
      setHands(h);
      setPlayers(p);
    });
  }, []);

  const playerName = (id: string | null) => (id ? players.find((p) => p.id === id)?.name ?? '?' : '?');

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>牌局紀錄</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="mj-content">
        {hands === null && <p className="mj-loading">載入緊…</p>}

        {hands !== null && hands.length === 0 && (
          <EmptyState
            eyebrow="未有紀錄"
            title="仲未有已完成嘅牌局"
            body="完成一局之後，每一舖嘅胡牌、番數同分數都會自動存喺呢度（只存喺呢部裝置）。"
          />
        )}

        {hands !== null && hands.length > 0 && (
          <div className="mj-history-list">
            {hands.map((hand) => (
              <div key={hand.id} className="mj-tile mj-history-card">
                <div className="mj-history-head">
                  <span className="mj-history-winner">{playerName(hand.winnerId)} 食糊</span>
                  <span className="mj-history-time">{formatTimestamp(hand.timestamp)}</span>
                </div>
                <div className="mj-history-sub">
                  {hand.selfDraw ? '自摸' : `出銃 · ${playerName(hand.discarderId)}打出`}
                  {' · '}
                  {hand.totalFan} 番 · {hand.score} 分
                </div>
                <div className="mj-history-tiles">
                  {hand.melds &&
                    parseJsonList<Meld>(hand.melds).map((m, i) => (
                      <span key={`meld-${i}`} className="mj-history-chip mj-history-meld">
                        {meldLabel(m)}
                      </span>
                    ))}
                  {parseJsonList<Tile>(hand.tiles).map((t, i) => (
                    <span key={i} className="mj-history-chip">
                      {tileLabel(t)}
                    </span>
                  ))}
                </div>
                <div className="mj-history-fan">
                  {hand.fanBreakdown
                    .filter((f) => f.awarded)
                    .map((f) => `${f.label}+${f.fan}`)
                    .join('　')}
                </div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
