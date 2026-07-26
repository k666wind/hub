# Hong Kong Mahjong AI Assistant — Project Specification v1.0

> 呢份係原始規格文件，逐字存底喺度，方便之後每個 phase 都可以返嚟對照。

## 1. Project Overview

**Project Name**: Hong Kong Mahjong AI Assistant

**Vision**: Develop a completely free, open-source Progressive Web App (PWA) that
assists players during Hong Kong Mahjong games. The application should work
entirely offline after installation, with no paid APIs, no cloud backend, and
no server required.

Primary goals:
- AI recognition of Mahjong tiles using the phone camera
- Automatic Hong Kong Mahjong fan calculation
- Score and chip management
- Match history
- Player statistics
- Support 2-player, 3-player and 4-player Mahjong
- Fully offline
- 100% free forever

## 2. Project Goals

The application must:
- Work as a PWA, installable on Android and iPhone
- Work offline, require no login, require no cloud account
- Store all data locally
- Be hosted on GitHub Pages

No paid service should ever be required.

## 3. Technology Stack

**Frontend**: React, TypeScript, Ionic Framework, Vite

**AI**: Browser-side only. Possible libraries: ONNX Runtime Web, TensorFlow.js,
OpenCV.js. No server-side AI.

**Storage**: Local only — IndexedDB. No Firebase. No Supabase. No backend
database.

**Hosting**: GitHub Pages, deployable via GitHub Actions.

## 4. Core Architecture

```
Camera → Tile Detection → Tile Classification → Rule Engine → Score Engine
→ Statistics → Local Database
```

Everything runs locally.

## 5. Functional Requirements

### 5.1 Game Modes
Support 2 / 3 / 4 players.

### 5.2 Rule Profiles
Multiple presets: Hong Kong Classic, Hong Kong Casual, Custom Rules. Each
profile configures: minimum fan, maximum fan, flower tiles enabled, Chicken
Hand enabled, dealer bonus, self draw bonus, limit hands, Seven Pairs,
Thirteen Orphans, All Pongs, Mixed One Suit, Pure One Suit, Small Dragons,
Big Dragons, Small Winds, Big Winds. Rules stored in JSON.

### 5.3 Camera Recognition
User takes a photo → recognises tiles → outputs a detected tile list. User
must always be able to manually edit the recognition result. AI should never
lock the user.

### 5.4 Manual Tile Editor
Add / remove / replace / sort tile, undo / redo.

### 5.5 Fan Calculation
Input: complete hand. Output: detected fan, total fan, detailed explanation
(e.g. Self Draw +1, Concealed Hand +1, All Pongs +3, Total = 5 Fan).

### 5.6 Fan Explanation
Every result explains why a fan is awarded AND why a fan is NOT awarded
(e.g. "Mixed One Suit — not awarded because multiple suits detected").

### 5.7 Scoreboard
Player names, dealer, current wind, round, current score, chip count,
automatic score updates.

### 5.8 Chip Mode
Configurable: 1 Fan = 1 Chip / 1 Fan = 2 Chips / fixed payment / custom
payment table.

### 5.9 Match History
Stores date, time, players, winner, winning hand, fan, score, optional
screenshot — everything local.

### 5.10 Statistics
Games played, win rate, average fan, highest fan, self draw %, discard loss
%, favourite winning hand, most common fan, average game duration.

### 5.11 Undo System
Undo last tile edit / last score / last hand / dealer changes / chip changes.

### 5.12 Settings
Dark mode, light mode, language, rule profile, camera settings, statistics
reset, export, import.

## 6. Non-Functional Requirements

Offline, fast load, mobile-first, portrait + landscape, responsive, no ads,
no analytics, no user tracking.

## 7. AI Requirements

AI only does Tile Detection + Tile Classification. AI must NOT calculate fan
— fan calculation always uses the Rule Engine.

```
Camera → AI Detection → Manual Correction → Rule Engine → Result
```

## 8. Rule Engine

The core, deterministic component (no AI involved), fully unit tested.
Responsibilities: validate hand, detect winning pattern, calculate fan,
generate explanation, generate score.

## 9. Local Database

IndexedDB collections: Players, Games, Hands, Statistics, Settings, Rule
Profiles.

## 10. Project Structure

```
hk-mahjong-ai-assistant/
  frontend/
    components/ pages/ hooks/ services/
    rule-engine/ fan/ score/ patterns/ rules.json
    ai/ detector/ classifier/ models/
    storage/ indexeddb/
  docs/
  tests/
  assets/
  .github/
```

*(Implemented as a single Vite root with `src/` playing the role of
`frontend/` — see `docs/handover.md` for the mapping.)*

## 11. Development Roadmap

- **Phase 1 (Foundation)**: project setup, PWA, dark mode, navigation,
  IndexedDB, settings.
- **Phase 2 (Rule Engine)**: tile model, winning hand validation, fan
  calculation, score calculation, rule profiles, unit tests.
- **Phase 3 (Game Management)**: players, scoreboard, dealer, round
  management, history, statistics, undo.
- **Phase 4 (AI Recognition)**: camera, tile detection, tile classification,
  manual correction, performance optimisation.
- **Phase 5 (Advanced Features)**: remaining tiles, waiting tiles,
  probability calculation, visible tile tracking, real-time camera, voice
  commands.

## 12. Future Features

Cloud sync (optional), multiplayer, replay mode, game export, PDF score
sheet, tournament mode, training mode, learning mode, AI suggestions, best
discard recommendation, expected value calculation.

## 13. Project Principles

Completely free, open source, offline-first, no paid API, no server
dependency, privacy-first, modular architecture, fully testable, easy to
extend, beginner-friendly codebase.

## 14. Out of Scope (Current Version)

Online multiplayer, user accounts, cloud database, social sharing, paid
subscriptions, advertisements, GPT/OpenAI APIs, server-side image
recognition.

## 15. Success Criteria

v1.0 is complete when: users can manually enter hands; the Rule Engine
correctly calculates HK Mahjong fan; scores/chips are auto-tracked; games
save locally; statistics generate; the app works fully offline; it's
deployable on GitHub Pages; no paid services required; architecture is
ready for future AI-based tile recognition.
