# Handover — Phase 3 (Game Management) ✅ Complete + Round-out ✅ Complete

Read this first in any new session before touching code. Full spec is in
`docs/spec.md`. Phase 1/2 notes are folded into this file below.

## What exists right now

**Structure mapping** (spec §10 used `frontend/`, this build uses `src/` as
the Vite root — same subfolders otherwise):

```
src/
  components/  ThemeProvider.tsx, EmptyState.tsx, TilePicker.tsx, WinRecorder.tsx
  hooks/       useTheme.ts
  pages/       HomePage (setup + live scoreboard), HistoryPage, StatisticsPage
               (still placeholders), SettingsPage
  services/    settingsService.ts, ruleProfileService.ts, playerService.ts,
               gameService.ts, statisticsService.ts
  storage/indexeddb/  db.ts — schema + get/put/remove/export/import
  rule-engine/  (unchanged since Phase 2 — see below)
  ai/           empty detector/ classifier/ models/ folders — Phase 4
  App.tsx       Ionic tabs shell + IonReactRouter (basename-aware, see bug note)
tests/          44 vitest tests — tiles/winningHand/fanCalculator/
                scoreCalculator/profiles/ruleProfileService/gameService
.github/workflows/deploy.yml   build + deploy to GitHub Pages on push to main
docs/spec.md    verbatim copy of the original spec
```

### Done in Phase 1 (Foundation)
- PWA installable, offline-capable, dark/light/system theme, 4-tab nav,
  full IndexedDB schema, mahjong-tile visual design (see `src/theme.css`).

### Done in Phase 2 (Rule Engine)
- Tile model, standard/seven-pairs/thirteen-orphans decomposition, fan
  calculation (自摸/門前清/碰碰胡/清一色/混一色/小三元/大三元/小四喜/大四喜/
  七對/十三么 with awarded+not-awarded explanations), score/chip calculation,
  rule profile CRUD. See `src/rule-engine/` — untouched in Phase 3, still
  pure/framework-agnostic.

### Done in Phase 3 (Game Management)
- **Players** (`services/playerService.ts`): create/list/rename/delete,
  persisted to the `players` store.
- **Games** (`services/gameService.ts` + extended `Game` type in `db.ts`):
  - `createGame` seats players in the order given (fixed physical seating —
    winds rotate, seats don't) and assigns initial winds via
    `WINDS_BY_COUNT` (2p: east/west, 3p: east/south/west, 4p: all four).
  - `recordWin` is the main entry point: builds a `HandContext`, calls
    `calculateFan` then `calculateScore`, applies the payment to
    `game.scores`, rotates the dealer (連莊 if the dealer won, otherwise
    passes to the next seat) and advances `roundWindIndex` once the dealer
    has cycled back to seat 0, persists the updated `Game` and a new `Hand`
    (including a `gameStateBefore` snapshot for undo), then recomputes
    statistics for every player in the game. Throws on an invalid hand or
    below-minimum fan — the UI is expected to check `calculateFan`'s result
    itself before calling this (see `WinRecorder`'s live preview).
  - `undoLastHand` (spec §5.11): restores `dealerSeatIndex`, `roundWindIndex`,
    `scores`, `handNumber` from the most recent hand's `gameStateBefore`
    snapshot, deletes that `Hand` record, recomputes statistics. **Only
    undoes one hand at a time**, and only the *most recent* one — there's no
    multi-level undo stack beyond that.
  - `endGame`, `listGames`, `listHandsForGame`, `listAllHands`.
- **Statistics** (`services/statisticsService.ts`): `recomputeStatisticsForPlayer`
  recalculates a player's `StatisticsSnapshot` from scratch by scanning all
  games/hands every time (simple and always-correct rather than incremental
  — fine at local-app scale, and it means undo never has to separately
  "un-count" anything).
- **UI**:
  - `HomePage`: game setup (player multi-select + quick-add, rule profile
    picker) when there's no active game; live scoreboard (names, scores,
    dealer badge, seat wind, round wind + hand number) plus 記錄食糊 /
    復原上一舖 / 完場 actions when there is one.
  - `TilePicker` (spec §5.4 Manual Tile Editor): tap-to-add/tap-to-remove
    grid for all 34 tile kinds (add/remove/sort covered; **undo/redo of
    individual tile edits is not implemented** — only whole-hand undo via
    `undoLastHand`).
  - `WinRecorder` (an `IonModal`): pick winner → self-draw or discarder →
    mark any exposed melds → enter the concealed part of the hand → live
    fan-breakdown preview (calls `calculateFan` directly as tiles/melds
    change, before committing) → confirm calls `gameService.recordWin`.
  - `MeldEditor` (round-out): mark exposed/concealed pong/chow/kong before
    entering the rest of the hand. Tap a meld type, then tap one tile
    (pong/kong) or the lowest tile of a run (chow) to add it; kong has a
    明槓/暗槓 toggle since a concealed kong still counts as concealed for
    門前清. `TilePicker`'s tile budget shrinks automatically
    (`14 - melds.length * 3`) as melds are added — the Rule Engine already
    accounted for kong's extra tile via `sets.length`, so no special-casing
    was needed there, only in the UI's remaining-tile count.
  - `HistoryPage` (round-out): lists every `Hand` via `listAllHands`,
    showing winner, self-draw/discarder, fan total, score, the full tile
    list, and any melds (parsed back from the JSON-serialized strings on
    the record).
  - `StatisticsPage` (round-out): lists every player's `StatisticsSnapshot`
    via `listStatistics` — games played, hands won, win rate, average fan
    (derived as `totalFan / handsWon` at render time), highest fan,
    self-draw rate, discard-loss count.
  - Chip mode picker (round-out, `services/chipModePresets.ts`): game setup
    now offers 1番1雞 (default) / 1番2雞 / 傳統追番表 (a fixed doubling
    table) / 自訂 (custom chips-per-fan number). No custom *table* editor
    yet — "自訂" only covers the `perFan` case; a from-scratch custom fixed
    table would need its own small table-editing UI if wanted later.

### Known gaps / things to watch
- **Fixed a real routing bug this phase**: `IonReactRouter` needs
  `basename={import.meta.env.BASE_URL}` or every route silently fails to
  match once the app is served under `/hk-mahjong-ai-assistant/` (works by
  accident in some local dev setups where base happens to be `/`, but
  breaks on GitHub Pages and in `vite preview`). Already fixed in `App.tsx`
  — if you ever see a blank `ion-router-outlet`, check this first.
- **Flowers still aren't handled in the UI.** `HandContext.flowers` is
  always `[]` from `WinRecorder` — flower tiles drawn during play aren't
  tracked anywhere yet (`rules.flowerTilesEnabled` exists in the schema but
  nothing reads it). Spec §5.12 lists flower handling as part of camera
  settings, so this may naturally get picked up in Phase 4, but it also
  works as a small standalone task if needed sooner.
- Only one active game is assumed at a time (`getActiveGame` returns
  whichever `status: 'active'` game comes back first from the index) —
  fine for this app's single-table use case, but don't call `createGame`
  again without ending the current one, or you'll get two "active" games
  and `getActiveGame`'s pick between them is arbitrary.
- `TilePicker`'s manual add/remove/sort is covered per spec §5.4, but
  undo/redo of *individual tile edits* still isn't implemented — only
  whole-hand undo via `undoLastHand`.
- Bundle is ~1.3 MB (mostly Ionic) — still fine, but Phase 4's camera/ONNX
  work should be lazy-loaded, not added to the main chunk.
- `react-router-dom` stays pinned to v5 (Ionic's peer dep requirement).

## Next up — Phase 4 (AI Recognition), per spec §11
1. Camera capture (browser `getUserMedia` / `<input capture>`).
2. Tile detection + classification (ONNX Runtime Web / TensorFlow.js /
   OpenCV.js — browser-side only, per spec §7 the AI must never calculate
   fan itself, only output tiles for the existing `TilePicker`/`MeldEditor`
   to pre-fill, editable before confirming). Lazy-load these libraries
   behind the camera feature so they don't bloat the main bundle.
3. Manual correction flow (mostly exists already via `TilePicker`).

Keep the same separation of concerns: `rule-engine/` stays pure; game state
and persistence go in `services/`; pages/components stay thin.
