# 香港麻雀 AI 助手 (Hong Kong Mahjong AI Assistant)

免費、開源、**完全離線**嘅 PWA，幫手打香港麻雀：影相認牌、自動計番、記分同睇戰績。
無登入、無雲端帳戶、無伺服器 — 所有資料只存喺你部裝置嘅 IndexedDB。

## 開發狀態

目前完成 **Phase 1 — Foundation**、**Phase 2 — Rule Engine** 同
**Phase 3 — Game Management**（包括紀錄／統計頁面、碰／上／槓標記、可揀嘅
籌碼計法）。下一步係 **Phase 4 — AI 認牌**。詳情見
[`docs/handover.md`](docs/handover.md)。

## 技術棧

- React 19 + TypeScript + Vite
- Ionic React（tabs 導覽、UI 元件）
- IndexedDB（`idb`）— 本地資料庫，無 Firebase / Supabase / 後端
- `vite-plugin-pwa` — 離線快取、可安裝
- Vitest — 單元測試
- GitHub Actions → GitHub Pages 自動部署

## 本地開發

```bash
npm install
npm run dev        # 開發伺服器
npm run test       # 跑 vitest
npm run build      # 產生 dist/，並跑 tsc 型別檢查
npm run preview    # 本地預覽 production build
```

## 部署去 GitHub Pages

1. 喺 GitHub 開一個叫 `hk-mahjong-ai-assistant` 嘅新 repo（名要同 `vite.config.ts` 入面嘅
   `base` 路徑一致，或者自己改 `base`）。
2. Push 呢個 repo 去 `main` branch。
3. 去 repo 嘅 **Settings → Pages**，Source 揀 **GitHub Actions**。
4. Push 之後，`.github/workflows/deploy.yml` 會自動 build 同部署；完成之後個 app 會喺
   `https://<你的 GitHub 用戶名>.github.io/hk-mahjong-ai-assistant/` 出現。

## 專案原則

完全免費、開源、離線優先、無收費 API、無伺服器依賴、私隱優先、模組化、可測試。
詳細規格見 [`docs/spec.md`](docs/spec.md)。
