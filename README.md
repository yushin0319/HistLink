# HistLink

歴史用語連鎖クイズ。Term と Edge のグラフをたどってゴールを目指すゲーム。GitHub description: 「歴史しりとり的なやつ」。

## スタック

- Backend: Python 3.11+ / FastAPI / SQLAlchemy 2.x / Pydantic / pytest + Hypothesis（uv 管理）
- Frontend: TypeScript / React 19 / Vite 8 / MUI v9 / Zustand / axios / Playwright（E2E） / Biome
- Studio: React 19 / Vite 7 / MUI v7 + @mui/x-data-grid / react-router v7 + react-hook-form + TanStack Query（自前管理画面、Refine は採用していない）
- パッケージマネージャ: Bun（frontend / studio とも `bun.lock` あり）
- DB: PostgreSQL 16（Docker local / Supabase 本番）
- デプロイ: Render（FE: Static / BE: Web Service）

## 構成

```
backend/app/
  main.py            FastAPI 起動・CORS・ルーター登録
  routes/games.py    ゲーム API（/games/start / /games/{id}/result / /games/rankings/overall）
  routes/admin.py    管理 API（/admin/terms / /admin/edges / /admin/games、verify_admin_token 必須）
  models/            SQLAlchemy（Term / Edge / Game）
  services/cache.py  キャッシュ初期化
  database.py        PostgreSQL 接続
frontend/src/        React アプリ（ゲーム画面）
studio/src/          管理画面（MUI + react-router v7 内製）
database/schema.sql  Term / Edge / Game テーブル
```

## API（主要）

**Game**
- `POST /v1/games/start` — ゲーム開始（難易度 easy/normal/hard）
- `POST /v1/games/{game_id}/result` — 結果保存
- `GET /v1/games/rankings/overall` — 総合ランキング

**Admin（`verify_admin_token` 必須）**
- `/admin/terms` — Term の CRUD（GET 一覧 / GET 詳細 / POST / PUT / DELETE）
- `/admin/edges` — Edge の CRUD
- `/admin/games` — Game の閲覧・削除

## 開発

```bash
# Backend (uv)
cd backend
uv sync --group dev
uv run pytest --cov=app
uv run uvicorn app.main:app --reload

# Frontend (Bun)
cd frontend
bun install
bun run dev          # :5173
bun run test:run
bun run build

# Studio（管理画面、Bun）
cd studio
bun install
bun run dev
bun run build

# DB（ローカル）
docker compose up -d
docker compose down -v   # リセット
```

## テスト方針

- Backend: pytest + Hypothesis（プロパティテスト）
- Frontend: vitest + @testing-library/react
- E2E: Playwright（`frontend/e2e/`）
- グローバル `tdd-policy.md` に従う

## デプロイ

- Render（main push で自動）
- n8n Health Check（10 分間隔）でスピンダウン防止
- CI: `.github/workflows/ci.yml` + `test.yml`（pytest + vitest）/ PR レビュー: `gemini-review.yml`
- Dependabot patch/minor は `dependabot-automerge.yml` で auto-merge

## 運用ルール

- main 直 commit 禁止、PR 経由でマージ
- 管理画面 (`/admin/*`) は `verify_admin_token` で認証必須

詳細は [CLAUDE.md](CLAUDE.md) を参照（あれば）。
