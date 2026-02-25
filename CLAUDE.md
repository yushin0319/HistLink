# HistLink

歴史用語連鎖クイズゲーム。用語間の関係を辿ってゴールを目指す。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 19 + TypeScript + Vite + MUI + Zustand |
| Backend | Python 3.12 + FastAPI + SQLAlchemy |
| Studio | React 18 + Refine（管理画面） |
| DB | PostgreSQL 16（ローカル: Docker / 本番: Supabase） |
| ホスティング | Render（FE: Static Site, BE: Web Service） |

## ディレクトリ構成

- `frontend/` - React フロントエンド（Vite）
- `backend/` - FastAPI バックエンド
- `studio/` - Refine 管理画面
- `database/` - スキーマ・シードデータ（33万行）
- `scripts/` - Git hooks セットアップ

## コマンド

```bash
# Backend
cd backend
pytest                     # テスト実行
pytest --cov=app           # カバレッジ付き
uvicorn app.main:app --reload  # 開発サーバー :8000

# Frontend
cd frontend
npm run dev                # 開発サーバー :5173
npx vitest run             # テスト実行
npm run test:coverage      # カバレッジ付き
npm run build              # 本番ビルド

# Studio
cd studio
npm run dev                # 開発サーバー
npm run build              # ビルド

# Docker（DB）
docker compose up -d       # PostgreSQL 起動
docker compose down -v     # DB リセット
```

## テスト方針

- **Backend**: pytest + Hypothesis（プロパティテスト）
- **Frontend**: vitest + @testing-library/react
- **E2E**: Playwright（frontend/e2e/）
- ドメインロジック → 単体テスト / API → 統合テスト / UI → コンポーネントテスト
- グローバル tdd-policy.md に従う

## CI/CD

- `test.yml`: PR・push 時に pytest + vitest 自動実行
- `gemini-review.yml`: shared-workflows 経由の PR レビュー
- `.githooks/pre-push`: push 前にテスト実行（`bash scripts/setup-hooks.sh` で有効化）

## デプロイ

- **本番**: https://histlink.onrender.com
- push 時に Render 自動デプロイ
- n8n Health Check（10分毎）でスピンダウン防止
