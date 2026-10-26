# HistLink

歴史用語連鎖クイズ。Term と Edge のグラフをたどってゴールを目指すゲーム。GitHub description: 「歴史しりとり的なやつ」。

- **本番（Frontend）**: https://histlink.onrender.com
- **API（Backend）**: https://histlink-backend.onrender.com

## スタック

- Backend: Python 3.11+ / FastAPI / SQLAlchemy 2.x（エンジン・セッションと `text()` の生 SQL。ORM モデルは無い）/ Pydantic + pydantic-settings / pytest + Hypothesis / ruff（uv 管理）
- Frontend: TypeScript 7 / React 19 / Vite 8 / MUI v9 / Zustand / axios / vitest v5 / Playwright（E2E） / Biome v2
- Studio: TypeScript 7 / React 19 / Vite 8 / MUI v9 + @mui/x-data-grid v9 / react-router v8 + react-hook-form + TanStack Query v5 / vitest v5（自前管理画面、Refine は採用していない。ローカル専用で本番デプロイは無い）
- パッケージマネージャ: Bun（ルート / frontend / studio にそれぞれ `bun.lock`。ルートは Biome・Husky・lint-staged のみ）
- DB: PostgreSQL 16（Docker local / Supabase 本番）
- デプロイ: Render（FE: Static / BE: Web Service）

## 構成

```
backend/app/
  main.py            FastAPI 起動・CORS・ルーター登録・/health
  config.py          設定（pydantic-settings。DATABASE_URL 必須、CORS_ORIGINS で上書き可）
  dependencies.py    verify_admin_token（Bearer トークンを ADMIN_SECRET と照合）
  routes/games.py    ゲーム API（/api/v1/games/...）
  routes/admin.py    管理 API（/admin/terms / /admin/edges / /admin/games、verify_admin_token 必須）
  schemas/           Pydantic のリクエスト・レスポンス定義
  services/cache.py  起動時に terms / edges をメモリへ読み込むキャッシュ
  services/route_generator.py      ルート生成（行き止まり回避付きランダムウォーク）
  services/distractor_generator.py 難易度別のダミー選択肢生成
  database.py        PostgreSQL 接続（SQLAlchemy エンジン・セッション）
  models/            空のパッケージ（ORM モデルは無く、SQL は routes / services の `text()`）
backend/tests/       pytest
frontend/src/        React アプリ（ゲーム画面）
frontend/e2e/        Playwright
studio/src/          管理画面（MUI + react-router v8 内製）
data/                terms.json / edges.json（シードの元データ）
database/schema.sql  terms / edges / games テーブル
database/seed.sql    初期データ（database/scripts/generate_seed.py が data/*.json から生成）
database/scripts/    シード生成・データ品質チェック・ランキング集計の SQL / スクリプト
```

## API（主要）

**Game**（prefix `/api/v1`、`config.py` の `api_v1_prefix`）
- `POST /api/v1/games/start` — ゲーム開始（難易度 easy/normal/hard）。全ルートと選択肢を一括で返し、ゲーム進行はフロントで行う
- `POST /api/v1/games/{game_id}/result` — 結果保存
- `PATCH /api/v1/games/{game_id}` — ゲーム情報の更新（主にリザルト画面での名前変更）
- `GET /api/v1/games/rankings/overall` — 総合ランキング

**Admin（prefix なし、`Authorization: Bearer <ADMIN_SECRET>` 必須）**
- `/admin/terms` — Term の CRUD（GET 一覧 / GET 詳細 / POST / PUT / DELETE）+ `GET /admin/terms/all` / `GET /admin/terms/{term_id}/edges`
- `/admin/edges` — Edge の CRUD + `GET /admin/edges/all`
- `/admin/games` — Game の閲覧（一覧 / 詳細）・削除

**その他**
- `GET|HEAD /health` — DB 疎通確認付きのヘルスチェック（失敗時 503）
- `GET|HEAD /` — 稼働確認

## 開発

```bash
# Backend (uv)
cd backend
uv sync --extra dev          # dev は [project.optional-dependencies]（dependency-groups は無い）
uv run pytest --cov=app
uv run uvicorn app.main:app --reload

# Frontend (Bun)
cd frontend
bun install
bun run dev          # :5173
bunx vitest run      # CI と同じ。package.json の test は watch モード
bun run build

# Studio（管理画面、Bun）
cd studio
bun install
bun run dev          # :5174。vite proxy で /api/admin/* → http://localhost:8000/admin/*
bun run test:run
bun run build

# Lint（リポルート。CI の test.yml は @biomejs/biome@2.4.6 固定で実行）
bunx @biomejs/biome check .

# Docker（ルートの .env が必要。.env.example をコピー）
docker compose up -d postgres   # DB だけ（schema.sql / seed.sql を初回に投入）
docker compose up -d            # postgres + backend(:8000) + frontend(:80) をまとめて起動
docker compose down -v          # リセット
```

環境変数: backend は `DATABASE_URL`（必須）と `ADMIN_SECRET`（管理 API）、`CORS_ORIGINS`（任意）。frontend は `VITE_API_BASE_URL`（未設定なら `http://localhost:8000`）、studio は `VITE_ADMIN_SECRET`（Bearer トークンとして送る）。

## テスト方針

- Backend: pytest + Hypothesis（プロパティテスト）
- Frontend: vitest + @testing-library/react
- E2E: Playwright（`frontend/e2e/`、chromium / firefox / mobile-chrome）。CI では走らない。`webServer` 設定が無いので、frontend（:5173）と backend を起動してから `cd frontend && bunx playwright test`
- グローバル `tdd-policy.md` に従う

## デプロイ

- Render（main push で自動。Render のサービス設定はリポ外）。本番 DB は Supabase（Session Mode、`backend/.env.example`）
- n8n `cron/health-check`（10 分間隔で `https://histlink-backend.onrender.com/health` を叩く）でスピンダウン防止
- CI: `.github/workflows/ci.yml`（frontend / studio の `tsc --noEmit`）+ `test.yml`（pytest（PostgreSQL 16 サービス）/ Biome / frontend・studio の build + vitest）/ PR レビュー: `gemini-review.yml`
- Dependabot patch/minor は `dependabot-automerge.yml` で auto-merge

## 運用ルール

- main 直 commit 禁止、PR 経由でマージ
- 管理画面 (`/admin/*`) は `verify_admin_token` で認証必須

詳細は [CLAUDE.md](CLAUDE.md) を参照。
