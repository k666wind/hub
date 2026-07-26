import { useEffect, useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonModal, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import WinRecorder from '../components/WinRecorder';
import type { Game, Player, RuleProfile } from '../storage/indexeddb/db';
import { createPlayer, listPlayers } from '../services/playerService';
import { listAllProfiles } from '../services/ruleProfileService';
import { createGame, endGame, getActiveGame, undoLastHand } from '../services/gameService';
import { CHIP_MODE_PRESETS, DEFAULT_CHIP_MODE_PRESET_ID, chipModeLabel, customPerFanChipMode } from '../services/chipModePresets';
import type { Wind } from '../rule-engine/tiles';
import './HomePage.css';

const ROUND_WIND_LABEL: Record<Wind, string> = { east: '東', south: '南', west: '西', north: '北' };
const CUSTOM_CHIP_PRESET_ID = 'custom';

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [game, setGame] = useState<Game | null | undefined>(undefined); // undefined = loading
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [chipPresetId, setChipPresetId] = useState<string>(DEFAULT_CHIP_MODE_PRESET_ID);
  const [customChipsPerFan, setCustomChipsPerFan] = useState(1);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const [p, r, g] = await Promise.all([listPlayers(), listAllProfiles(), getActiveGame()]);
    setPlayers(p);
    setProfiles(r);
    setGame(g ?? null);
    if (!selectedProfileId && r.length > 0) setSelectedProfileId(r[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  async function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    const player = await createPlayer(name);
    setNewPlayerName('');
    await refresh();
    setSelectedPlayerIds((prev) => (prev.length < 4 ? [...prev, player.id] : prev));
  }

  async function handleStartGame() {
    if (selectedPlayerIds.length < 2 || !selectedProfileId) return;
    const preset = CHIP_MODE_PRESETS.find((p) => p.id === chipPresetId);
    const chipMode = preset ? preset.chipMode : customPerFanChipMode(customChipsPerFan);
    await createGame({
      playerIds: selectedPlayerIds,
      ruleProfileId: selectedProfileId,
      chipMode,
    });
    setSelectedPlayerIds([]);
    await refresh();
  }

  async function handleUndo() {
    if (!game) return;
    try {
      await undoLastHand(game.id);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '未能復原');
    }
  }

  async function handleEndGame() {
    if (!game) return;
    await endGame(game.id);
    setConfirmEnd(false);
    await refresh();
  }

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const activeProfile = profiles.find((p) => p.id === game?.ruleProfileId);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>{game ? '雀局進行中' : '雀局'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="mj-content">
        {game === undefined && <p className="mj-loading">載入緊…</p>}

        {game === null && (
          <div className="mj-setup">
            <div className="mj-hero mj-tile">
              <span className="mj-eyebrow">未有進行中的牌局</span>
              <h1>開一局新牌</h1>
              <p className="mj-hero-sub">揀 2 至 4 位玩家同規則庫，開始記錄番數同籌碼。</p>
            </div>

            <section className="mj-tile mj-setup-section">
              <h3>玩家（{selectedPlayerIds.length}/4）</h3>
              <div className="mj-pill-row">
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`mj-pill ${selectedPlayerIds.includes(p.id) ? 'mj-pill-active' : ''}`}
                    onClick={() => togglePlayer(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="mj-add-player">
                <input
                  className="mj-text-input"
                  placeholder="新玩家名"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <button type="button" className="mj-add-btn" onClick={handleAddPlayer}>
                  新增
                </button>
              </div>
            </section>

            <section className="mj-tile mj-setup-section">
              <h3>規則庫</h3>
              <div className="mj-pill-row">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`mj-pill ${selectedProfileId === p.id ? 'mj-pill-active' : ''}`}
                    onClick={() => setSelectedProfileId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="mj-tile mj-setup-section">
              <h3>籌碼計法</h3>
              <div className="mj-pill-row">
                {CHIP_MODE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`mj-pill ${chipPresetId === preset.id ? 'mj-pill-active' : ''}`}
                    onClick={() => setChipPresetId(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`mj-pill ${chipPresetId === CUSTOM_CHIP_PRESET_ID ? 'mj-pill-active' : ''}`}
                  onClick={() => setChipPresetId(CUSTOM_CHIP_PRESET_ID)}
                >
                  自訂
                </button>
              </div>
              <p className="mj-setup-hint">
                {chipPresetId === CUSTOM_CHIP_PRESET_ID
                  ? '自訂每番籌碼數'
                  : (CHIP_MODE_PRESETS.find((p) => p.id === chipPresetId)?.description ?? '')}
              </p>
              {chipPresetId === CUSTOM_CHIP_PRESET_ID && (
                <div className="mj-add-player">
                  <input
                    type="number"
                    min={1}
                    className="mj-text-input"
                    value={customChipsPerFan}
                    onChange={(e) => setCustomChipsPerFan(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <span className="mj-setup-hint">雞 / 每番</span>
                </div>
              )}
            </section>

            <button
              type="button"
              className="mj-cta"
              disabled={selectedPlayerIds.length < 2 || !selectedProfileId}
              onClick={handleStartGame}
            >
              開始牌局
            </button>
          </div>
        )}

        {game && (
          <div className="mj-scoreboard">
            <div className="mj-tile mj-round-banner">
              <span className="mj-eyebrow">
                {ROUND_WIND_LABEL[(['east', 'south', 'west', 'north'] as Wind[])[game.roundWindIndex]]}圈 · 第{' '}
                {game.handNumber} 舖
              </span>
              <span className="mj-round-rules">
                {activeProfile?.name ?? ''} · {chipModeLabel(game.chipMode)}
              </span>
            </div>

            <div className="mj-players">
              {game.playerIds.map((id, i) => (
                <div key={id} className={`mj-tile mj-player-row ${i === game.dealerSeatIndex ? 'mj-player-dealer' : ''}`}>
                  <div className="mj-player-name">
                    {playerName(id)}
                    {i === game.dealerSeatIndex && <span className="mj-dealer-badge">莊</span>}
                  </div>
                  <div className="mj-player-wind">{ROUND_WIND_LABEL[game.seatWinds[id]]}</div>
                  <div className={`mj-player-score ${game.scores[id] >= 0 ? 'mj-score-positive' : 'mj-score-negative'}`}>
                    {game.scores[id]}
                  </div>
                </div>
              ))}
            </div>

            <div className="mj-scoreboard-actions">
              <button type="button" className="mj-cta" onClick={() => setShowRecorder(true)}>
                記錄食糊
              </button>
              <button type="button" className="mj-secondary-btn" onClick={handleUndo}>
                復原上一舖
              </button>
              <button type="button" className="mj-secondary-btn mj-danger" onClick={() => setConfirmEnd(true)}>
                完場
              </button>
            </div>
          </div>
        )}

        <IonModal isOpen={showRecorder && !!game && !!activeProfile} onDidDismiss={() => setShowRecorder(false)}>
          {game && activeProfile && (
            <WinRecorder
              game={game}
              players={players}
              ruleProfile={activeProfile}
              onClose={() => setShowRecorder(false)}
              onRecorded={async () => {
                setShowRecorder(false);
                await refresh();
              }}
            />
          )}
        </IonModal>

        <IonAlert
          isOpen={confirmEnd}
          onDidDismiss={() => setConfirmEnd(false)}
          header="完場？"
          message="完場之後呢局就會封存，可以喺紀錄度睇返。"
          buttons={[
            { text: '取消', role: 'cancel' },
            { text: '確定完場', handler: handleEndGame },
          ]}
        />

        <IonAlert
          isOpen={!!notice}
          onDidDismiss={() => setNotice(null)}
          header="提示"
          message={notice ?? ''}
          buttons={['知道喇']}
        />
      </IonContent>
    </IonPage>
  );
}
