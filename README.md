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
| Frontend | React 19 + TypeScript + Vite + MUI |
| Backend | Python (FastAPI) + SQLAlchemy |
| Database | PostgreSQL (Supabase) |
| Hosting | Render (Frontend: Static Site, Backend: Web Service) |
| Testing | Vitest (frontend), pytest (backend) |

## 本番環境

| サービス | URL |
|----------|-----|
| フロントエンド | https://histlink.onrender.com |
| バックエンドAPI | https://histlink-backend.onrender.com |
| データベース | Supabase PostgreSQL (Session Pooler) |

### 環境変数（Renderで設定）

| サービス | 変数名 | 値 |
|----------|--------|-----|
| Backend | `DATABASE_URL` | Supabase接続文字列 |
| Frontend | `VITE_API_BASE_URL` | `https://histlink-backend.onrender.com` |

## ローカル開発

### セットアップ

```bash
# Docker起動（DB + Backend）
docker compose up -d

# フロントエンド開発サーバー
cd frontend && npm install && npm run dev
```

### 開発コマンド

#### フロントエンド

```bash
cd frontend

npm run dev           # 開発サーバー起動
npm test              # テスト（watch mode）
npm run test:run      # テスト（1回実行）
npm run test:coverage # カバレッジ付き
npm run build         # 本番ビルド
```

#### バックエンド

```bash
cd backend

pytest                          # 全テスト
pytest --cov=app               # カバレッジ付き
uvicorn app.main:app --reload  # 開発サーバー
```

#### データベース

```bash
# 初期化（クリーンスタート）
docker compose down -v
docker compose up -d

# DB接続
docker compose exec postgres psql -U histlink_user -d histlink

# TSV更新後の再構築
./scripts/update_migration.sh
```

## 難易度システム

| 難易度 | Tier制限 | エッジ制限 |
|--------|----------|------------|
| easy   | Tier1のみ | easyのみ |
| normal | Tier1-2  | easy, normal |
| hard   | 全Tier   | 全エッジ |

## ディレクトリ構成

```
HistLink/
├── frontend/          # React フロントエンド
│   ├── src/
│   │   ├── components/   # 再利用可能なコンポーネント
│   │   ├── pages/        # ページコンポーネント
│   │   ├── stores/       # Zustand ストア
│   │   ├── services/     # API通信層
│   │   └── types/        # 型定義
│   └── package.json
├── backend/           # FastAPI バックエンド
│   ├── app/
│   │   ├── routes/       # APIエンドポイント
│   │   ├── services/     # ビジネスロジック
│   │   ├── models/       # SQLAlchemyモデル
│   │   └── schemas/      # Pydanticスキーマ
│   └── tests/
├── database/          # DBマイグレーション
├── data/              # TSVデータファイル
└── docker-compose.yml
```

## 開発状況

- フロントエンド: 完成（テストカバレッジ 98%）
- バックエンド: 完成（テストカバレッジ 93%）
- デプロイ: Render + Supabase

## ドキュメント

- [CLAUDE.md](./CLAUDE.md) - 開発ガイドライン
