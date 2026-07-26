import { useMemo } from 'react';
import { dragon, sortTiles, suit, tileLabel, wind, type Tile } from '../rule-engine/tiles';
import './TilePicker.css';

const SUITS = ['characters', 'dots', 'bamboo'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const WINDS = ['east', 'south', 'west', 'north'] as const;
const DRAGONS = ['red', 'green', 'white'] as const;

interface TilePickerProps {
  value: Tile[];
  onChange: (tiles: Tile[]) => void;
  maxTiles?: number;
}

export default function TilePicker({ value, onChange, maxTiles = 14 }: TilePickerProps) {
  const sorted = useMemo(() => sortTiles(value), [value]);
  const full = value.length >= maxTiles;

  function addTile(tile: Tile) {
    if (full) return;
    onChange([...value, tile]);
  }
  function removeAt(index: number) {
    const next = [...sorted];
    next.splice(index, 1);
    onChange(next);
  }

  return (
    <div className="mj-tile-picker">
      <div className="mj-tile-picker-header">
        <span>已揀 {value.length} / {maxTiles} 隻</span>
        <button
          type="button"
          className="mj-tile-picker-clear"
          onClick={() => onChange([])}
          disabled={value.length === 0}
        >
          清空
        </button>
      </div>

      <div className="mj-tile-picker-selected mj-tile">
        {sorted.length === 0 && (
          <span className="mj-tile-picker-hint">揀齊成手牌（包括食糊嗰隻），撳一下已揀嘅牌可以移除</span>
        )}
        {sorted.map((t, i) => (
          <button key={`${t.kind}-${i}`} type="button" className="mj-chip" onClick={() => removeAt(i)}>
            {tileLabel(t)}
          </button>
        ))}
      </div>

      {SUITS.map((s) => (
        <div className="mj-tile-picker-row" key={s}>
          {RANKS.map((rank) => {
            const tile = suit(s, rank);
            return (
              <button
                key={rank}
                type="button"
                className="mj-tile-btn"
                disabled={full}
                onClick={() => addTile(tile)}
              >
                {tileLabel(tile)}
              </button>
            );
          })}
        </div>
      ))}

      <div className="mj-tile-picker-row">
        {WINDS.map((w) => {
          const tile = wind(w);
          return (
            <button key={w} type="button" className="mj-tile-btn" disabled={full} onClick={() => addTile(tile)}>
              {tileLabel(tile)}
            </button>
          );
        })}
        {DRAGONS.map((d) => {
          const tile = dragon(d);
          return (
            <button key={d} type="button" className="mj-tile-btn" disabled={full} onClick={() => addTile(tile)}>
              {tileLabel(tile)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
