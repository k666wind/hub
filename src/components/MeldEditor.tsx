import { useState } from 'react';
import { dragon, suit, tileLabel, wind, type Tile } from '../rule-engine/tiles';
import type { Meld, MeldType } from '../rule-engine/hand';
import './MeldEditor.css';

const SUITS = ['characters', 'dots', 'bamboo'] as const;
const WINDS = ['east', 'south', 'west', 'north'] as const;
const DRAGONS = ['red', 'green', 'white'] as const;

const MELD_TYPE_LABEL: Record<MeldType, string> = { chow: '上（食住食）', pong: '碰', kong: '槓' };

function meldLabel(meld: Meld): string {
  const tiles = meld.tiles.map(tileLabel);
  if (meld.type === 'chow') return `上 ${tiles.join('')}`;
  if (meld.type === 'kong') return `${meld.concealed ? '暗' : '明'}槓 ${tiles[0]}`;
  return `碰 ${tiles[0]}`;
}

interface MeldEditorProps {
  melds: Meld[];
  onChange: (melds: Meld[]) => void;
}

export default function MeldEditor({ melds, onChange }: MeldEditorProps) {
  const [meldType, setMeldType] = useState<MeldType>('pong');
  const [kongConcealed, setKongConcealed] = useState(false);

  function addMeld(meld: Meld) {
    onChange([...melds, meld]);
  }

  function removeMeld(index: number) {
    onChange(melds.filter((_, i) => i !== index));
  }

  function pickTile(tile: Tile) {
    if (meldType === 'pong') {
      addMeld({ type: 'pong', tiles: [tile, tile, tile], concealed: false });
      return;
    }
    if (meldType === 'kong') {
      addMeld({ type: 'kong', tiles: [tile, tile, tile, tile], concealed: kongConcealed });
      return;
    }
    // chow — only suit tiles rank 1-7, and only from the grid rows (honors filtered below)
    if (tile.kind === 'suit' && tile.rank <= 7) {
      const t2 = suit(tile.suit, (tile.rank + 1) as never);
      const t3 = suit(tile.suit, (tile.rank + 2) as never);
      addMeld({ type: 'chow', tiles: [tile, t2, t3], concealed: false });
    }
  }

  return (
    <div className="mj-meld-editor">
      {melds.length > 0 && (
        <div className="mj-meld-list">
          {melds.map((meld, i) => (
            <button key={i} type="button" className="mj-chip" onClick={() => removeMeld(i)}>
              {meldLabel(meld)} ✕
            </button>
          ))}
        </div>
      )}

      <div className="mj-pill-row">
        {(['pong', 'kong', 'chow'] as MeldType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`mj-pill ${meldType === t ? 'mj-pill-active' : ''}`}
            onClick={() => setMeldType(t)}
          >
            {MELD_TYPE_LABEL[t]}
          </button>
        ))}
        {meldType === 'kong' && (
          <button
            type="button"
            className={`mj-pill ${kongConcealed ? 'mj-pill-active' : ''}`}
            onClick={() => setKongConcealed((v) => !v)}
          >
            {kongConcealed ? '暗槓' : '明槓'}
          </button>
        )}
      </div>

      <p className="mj-meld-hint">
        {meldType === 'chow' ? '揀順子最細嗰隻牌' : '揀邊隻牌'}
      </p>

      {SUITS.map((s) => (
        <div className="mj-tile-picker-row" key={s}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => {
            const tile = suit(s, rank as never);
            const disabled = meldType === 'chow' && rank > 7;
            return (
              <button
                key={rank}
                type="button"
                className="mj-tile-btn"
                disabled={disabled}
                onClick={() => pickTile(tile)}
              >
                {tileLabel(tile)}
              </button>
            );
          })}
        </div>
      ))}

      {meldType !== 'chow' && (
        <div className="mj-tile-picker-row">
          {WINDS.map((w) => (
            <button key={w} type="button" className="mj-tile-btn" onClick={() => pickTile(wind(w))}>
              {tileLabel(wind(w))}
            </button>
          ))}
          {DRAGONS.map((d) => (
            <button key={d} type="button" className="mj-tile-btn" onClick={() => pickTile(dragon(d))}>
              {tileLabel(dragon(d))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
