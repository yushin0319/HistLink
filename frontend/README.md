# HistLink frontend

ゲーム画面の React アプリ（TypeScript 7 / React 19 / Vite 8）。リポ全体の構成・API・デプロイはルートの [README](../README.md) を参照。

Lint は ESLint ではなく Biome（設定はリポルートの `biome.json`）。

## コマンド

```bash
bun install
bun run dev            # Vite 開発サーバー（:5173）
bun run build          # tsc -b && vite build
bunx vitest run        # 単発実行（CI と同じ）。bun run test は watch モード
bun run test:coverage  # vitest --coverage
bun run lint           # biome check ..（リポルート基準）
```

E2E（Playwright）のテストは `e2e/` にある。`playwright.config.ts` に `webServer` が無いので、`bun run dev`（:5173）と backend を起動してから `bunx playwright test` で実行する（CI では走らない）。

API の接続先は `VITE_API_BASE_URL`（未設定なら `http://localhost:8000`）に `/api/v1` を付けたもの（`src/services/api.ts`）。
