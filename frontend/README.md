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

E2E（Playwright）のテストは `e2e/` にある。
