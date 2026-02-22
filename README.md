# HistLink

歴史用語をつなげるクイズゲーム

**本番環境:** https://histlink.onrender.com

## 概要

日本史・西洋史の用語を連鎖的につなぐ歴史学習ゲーム。
関連する出来事を選んでハイスコアを目指そう！

### 主な機能

- 3段階の難易度（かんたん/ふつう/難しい）
- 3つのステージ数（10/30/50問）
- ライフシステム（3ライフ）
- タイマー制（20秒）
- ランキング機能（X問ランキング/全体ランキング）
- ルートおさらい機能

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 19 + TypeScript + Vite + MUI + Zustand |
| Studio | React 18 + Refine + MUI (管理画面) |
| Backend | Python 3.12 (FastAPI) + SQLAlchemy |
| Database | PostgreSQL 16 (ローカル: Docker / 本番: Supabase) |
| Hosting | Render (Frontend: Static Site, Backend: Web Service) |
| Testing | Vitest + Playwright (frontend), pytest + Hypothesis (backend) |
| CI/CD | GitHub Actions (テスト自動実行 + Gemini PRレビュー) |

## 本番環境

| サービス | URL |
|----------|-----|
| フロントエンド | https://histlink.onrender.com |
| バックエンドAPI | https://histlink-backend.onrender.com |
| データベース | Supabase PostgreSQL (Session Pooler) |

### 環境変数（Renderで設定）

| サービス | 変数名 | 説明 |
|----------|--------|------|
| Backend | `DATABASE_URL` | Supabase接続文字列 |
| Frontend | `VITE_API_BASE_URL` | `https://histlink-backend.onrender.com` |

> `CORS_ORIGINS` はデフォルトで本番URL含むため設定不要。`ADMIN_SECRET` は Studio（ローカル専用）の認証用で、ローカル `.env` に設定。

## ローカル開発

### セットアップ

```bash
# 1. 環境変数を準備
cp .env.example .env
# .env のパスワード等を必要に応じて編集（ローカル開発用のダミー値でOK）

# 2. Docker起動（PostgreSQL + Backend）
docker compose up -d

# 3. フロントエンド開発サーバー
cd frontend && npm install && npm run dev

# 4. Git hooks セットアップ（push前テスト自動実行）
bash scripts/setup-hooks.sh
```

### 開発コマンド

#### フロントエンド

```bash
cd frontend

npm run dev           # 開発サーバー起動（http://localhost:5173）
npm test              # テスト（watch mode）
npm run test:run      # テスト（1回実行）
npm run test:coverage # カバレッジ付き
npm run build         # 本番ビルド
```

#### バックエンド

```bash
cd backend

pytest                          # 全テスト（DB未起動時はDB依存テストがスキップされる）
pytest --cov=app               # カバレッジ付き
uvicorn app.main:app --reload  # 開発サーバー（http://localhost:8000）
```

#### Studio（管理画面）

```bash
cd studio

npm install && npm run dev  # 開発サーバー起動
npm run build               # 本番ビルド
```

用語・関連（エッジ）の追加/編集/削除、ゲーム履歴の閲覧ができます。バックエンドの Admin API（`ADMIN_SECRET` で認証）を使用します。

#### E2Eテスト

```bash
cd frontend

npx playwright install          # ブラウザインストール（初回のみ）
npx playwright test             # 全ブラウザで実行（Chromium, Firefox, Mobile Chrome）
npx playwright test --ui        # UIモードで実行
```

#### データベース

```bash
# 初期化（クリーンスタート）
docker compose down -v
docker compose up -d

# DB接続
docker compose exec postgres psql -U histlink_user -d histlink

# キャッシュクリア
docker compose restart backend
```

## テスト

### テスト構成

| 種類 | ツール | 対象 |
|------|--------|------|
| Backend ユニット | pytest | API・バリデーション・ランキング |
| Backend 統合 | pytest | ゲームライフサイクル横断 |
| Backend プロパティ | Hypothesis | ルート生成・スコア計算 |
| Frontend ユニット | Vitest + testing-library | コンポーネント・ストア・サービス |
| E2E | Playwright | Chromium / Firefox / Mobile Chrome (Pixel 5) |

### CI/CD パイプライン

PR作成時・mainプッシュ時に自動実行:

- **Backend**: PostgreSQL 16 サービスコンテナ + pytest
- **Frontend**: Vitest（ユニットテスト）
- **Gemini Review**: PRに対してAIコードレビュー

### Pre-push Hook

`bash scripts/setup-hooks.sh` でセットアップすると、`git push` 時にバックエンド・フロントエンドのテストが自動実行されます。テスト失敗時はpushがブロックされます。

## 難易度システム

| 難易度 | Tier制限 | エッジ制限 | ライフボーナス |
|--------|----------|------------|----------------|
| easy   | Tier1のみ | easyのみ | +100/ライフ |
| normal | Tier1-2  | easy, normal | +200/ライフ |
| hard   | 全Tier   | 全エッジ | +300/ライフ |

## ディレクトリ構成

```
HistLink/
├── frontend/              # React フロントエンド
│   ├── src/
│   │   ├── components/       # 再利用可能なコンポーネント
│   │   ├── pages/            # ページコンポーネント
│   │   ├── stores/           # Zustand ストア
│   │   ├── services/         # API通信層
│   │   └── types/            # 型定義
│   ├── e2e/               # Playwright E2Eテスト
│   └── playwright.config.ts
├── backend/               # FastAPI バックエンド
│   ├── app/
│   │   ├── routes/           # APIエンドポイント
│   │   ├── services/         # ビジネスロジック
│   │   ├── models/           # SQLAlchemyモデル
│   │   └── schemas/          # Pydanticスキーマ
│   └── tests/             # pytest テスト
├── studio/                # 管理画面（HistLink Studio）
│   └── src/
│       ├── pages/            # 用語・関連・ゲーム履歴の管理
│       ├── providers/        # Refine データプロバイダー
│       └── contexts/         # データコンテキスト
├── database/              # スキーマ・シードSQL
├── data/                  # JSONデータファイル
├── .github/workflows/     # CI/CD（テスト + PRレビュー）
├── .githooks/             # Git hooks（pre-push）
├── scripts/               # セットアップスクリプト
├── docker-compose.yml     # ローカル開発環境
└── .env.example           # 環境変数テンプレート
```
