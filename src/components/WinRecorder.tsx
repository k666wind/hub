import { useMemo, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/react';
import { close } from 'ionicons/icons';
import TilePicker from './TilePicker';
import MeldEditor from './MeldEditor';
import type { Game, Player, RuleProfile } from '../storage/indexeddb/db';
import type { Tile, Wind } from '../rule-engine/tiles';
import type { HandContext, Meld } from '../rule-engine/hand';
import { calculateFan } from '../rule-engine/fan/fanCalculator';
import { recordWin } from '../services/gameService';
import './WinRecorder.css';

const ROUND_WINDS: Wind[] = ['east', 'south', 'west', 'north'];

interface WinRecorderProps {
  game: Game;
  players: Player[];
  ruleProfile: RuleProfile;
  onClose: () => void;
  onRecorded: () => void;
}

export default function WinRecorder({ game, players, ruleProfile, onClose, onRecorded }: WinRecorderProps) {
  const [winnerId, setWinnerId] = useState(game.playerIds[0]);
  const [selfDraw, setSelfDraw] = useState(true);
  const [discarderId, setDiscarderId] = useState<string | null>(null);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  // Every meld takes up one of the 4 sets; a kong just happens to use a 4th
  // physical tile instead of 3, which the Rule Engine already accounts for.
  const requiredConcealedTiles = 14 - melds.length * 3;

  const preview = useMemo(() => {
    if (tiles.length !== requiredConcealedTiles) return null;
    const context: HandContext = {
      concealedTiles: tiles,
      melds,
      winningTile: tiles[tiles.length - 1],
      selfDraw,
      seatWind: game.seatWinds[winnerId],
      roundWind: ROUND_WINDS[game.roundWindIndex],
      flowers: [],
    };
    return calculateFan(context, ruleProfile.rules);
  }, [tiles, melds, requiredConcealedTiles, selfDraw, winnerId, game, ruleProfile]);

  function handleMeldsChange(next: Meld[]) {
    setMelds(next);
    // Keep only as many concealed tiles as still fit after the meld change.
    const nextMax = 14 - next.length * 3;
    if (tiles.length > nextMax) setTiles(tiles.slice(0, nextMax));
  }

  async function handleConfirm() {
    if (!selfDraw && !discarderId) {
      setError('請揀邊個打出嗰隻食糊牌');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordWin({
        game,
        ruleProfile,
        winnerId,
        selfDraw,
        discarderId: selfDraw ? null : discarderId,
        tiles,
        melds,
      });
      onRecorded();
    } catch (e) {
      setError(e instanceof Error ? e.message : '未能記錄呢舖');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>記錄食糊</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="mj-content">
        <div className="mj-recorder">
          <section>
            <h3>邊個食糊？</h3>
            <div className="mj-pill-row">
              {game.playerIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`mj-pill ${winnerId === id ? 'mj-pill-active' : ''}`}
                  onClick={() => setWinnerId(id)}
                >
                  {playerName(id)}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>點食？</h3>
            <div className="mj-pill-row">
              <button
                type="button"
                className={`mj-pill ${selfDraw ? 'mj-pill-active' : ''}`}
                onClick={() => setSelfDraw(true)}
              >
                自摸
              </button>
              <button
                type="button"
                className={`mj-pill ${!selfDraw ? 'mj-pill-active' : ''}`}
                onClick={() => setSelfDraw(false)}
              >
                出銃
              </button>
            </div>
          </section>

          {!selfDraw && (
            <section>
              <h3>邊個打出？</h3>
              <div className="mj-pill-row">
                {game.playerIds
                  .filter((id) => id !== winnerId)
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`mj-pill ${discarderId === id ? 'mj-pill-active' : ''}`}
                      onClick={() => setDiscarderId(id)}
                    >
                      {playerName(id)}
                    </button>
                  ))}
              </div>
            </section>
          )}

          <section>
            <h3>副露（碰／上／槓，冇就唔使揀）</h3>
            <MeldEditor melds={melds} onChange={handleMeldsChange} />
          </section>

          <section>
            <h3>手牌（仲要揀 {requiredConcealedTiles} 隻）</h3>
            <TilePicker value={tiles} onChange={setTiles} maxTiles={requiredConcealedTiles} />
          </section>

          {preview && (
            <section className="mj-tile mj-fan-preview">
              <h3>計番結果</h3>
              {preview.breakdown.map((r, i) => (
                <div key={i} className={`mj-fan-row ${r.awarded ? 'mj-fan-awarded' : 'mj-fan-not-awarded'}`}>
                  <span>
                    {r.label}
                    {r.awarded ? ` +${r.fan}` : ''}
                  </span>
                  <span className="mj-fan-reason">{r.reason}</span>
                </div>
              ))}
              <div className="mj-fan-total">
                總番：{preview.totalFan}
                {preview.isLimitHand ? '（爆棚）' : ''}
                {preview.isChickenHand ? '（雞胡）' : ''}
              </div>
              {!preview.meetsMinimum && (
                <p className="mj-fan-warning">未夠最低番數，呢個規則庫又冇開雞胡</p>
              )}
            </section>
          )}

          {tiles.length === requiredConcealedTiles && !preview && (
            <p className="mj-fan-warning">呢舖牌組唔到有效胡牌，check 下係咪選漏或者選多咗</p>
          )}

          {error && <p className="mj-fan-warning">{error}</p>}

          <IonButton
            expand="block"
            className="mj-confirm-btn"
            disabled={!preview?.meetsMinimum || saving}
            onClick={handleConfirm}
          >
            確認食糊
          </IonButton>
        </div>
      </IonContent>
    </>
  );
}
