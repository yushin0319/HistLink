# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**HistLink** - 日本史・西洋史の用語を連鎖的につなぐ歴史学習ゲーム

### 技術スタック
- **Backend**: Python (FastAPI) + SQLAlchemy
- **Database**: PostgreSQL 16 (Docker)
- **Frontend**: React 19 + TypeScript + Vite + MUI
- **Testing**: pytest (backend), Vitest + Testing Library (frontend)

### アーキテクチャ

**Backend (backend/app/):**
- `routes/`: APIエンドポイント（games.py, routes.py）
- `services/`: ビジネスロジック（route_generator.py, distractor_generator.py）
- `models/`: SQLAlchemyモデル
- `schemas/`: Pydanticスキーマ
- `database.py`: DB接続管理
- `config.py`: 環境設定

**Database:**
- `data/*.tsv`: 単一の情報源（Single Source of Truth）
- `database/migrations/`: SQLマイグレーション（番号付き）
- `database/scripts/`: データ品質チェックSQL

**Frontend (frontend/):**
- Vite + React 19 + TypeScript
- MUI (Material-UI) コンポーネント
- Zustand (状態管理)

---

## 開発コマンド

### データベース

```bash
# Docker起動
docker compose up -d

# DB接続（ホストから）
PGPASSWORD=histlink_dev_password psql -h localhost -p 5432 -U histlink_user -d histlink

# DB接続（Docker内から）
docker compose exec postgres psql -U histlink_user -d histlink

# TSVファイル更新後の必須作業（スキーマ完全再構築）
./scripts/update_migration.sh

# データ品質チェック
PGPASSWORD=histlink_dev_password psql -h localhost -p 5432 -U histlink_user -d histlink -f database/scripts/check_data_quality.sql
```

### Backend

```bash
cd backend

# テスト実行
pytest                              # 全テスト
pytest tests/test_data_quality.py -v  # データ品質テストのみ
pytest -k test_function_name        # 特定テストのみ
pytest --cov=app --cov-report=html  # カバレッジ付き

# Linter/Formatter
ruff check .                        # Lint実行
ruff check --fix .                  # 自動修正

# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# 開発サーバー起動
npm run dev

# テスト実行
npm test                   # Vitest実行（watch mode）
npm run test:run           # Vitest 1回実行
npm run test:ui            # Vitest UI
npm run test:coverage      # カバレッジ付き

# ビルド
npm run build              # 本番ビルド
npm run preview            # ビルドプレビュー

# Lint
npm run lint
```

---

## 重要ルール

### 1. ファイル作成ルール ⚠️ **最重要**

**MUST**: 新しいファイルを作成する前に、**必ず**ユーザーに以下を確認：

1. **ファイル名（命名規則）**
   - 既存のファイル名パターンに従うか？
   - 新しい命名規則が必要か？

2. **配置場所（ディレクトリ構造）**
   - どのディレクトリに配置するか？
   - 新しいサブディレクトリが必要か？

3. **既存ファイルとの統合可能性**
   - 既存ファイルとマージできるか？
   - 分離する必要性は本当にあるか？

**例外なし。どんなに自明に見えても確認すること。**

### 2. ドキュメント作成の基本方針 ⚠️ **最重要**

#### 2-1. ハードコードの禁止

**絶対に守ること：具体的な件数・数値をドキュメントに書かない**

```markdown
# ❌ NG - 具体的な件数を書く
- terms.tsv: 210件
- relations.tsv: 714件
- 平均次数: 6.80

# ✅ OK - 確認方法のみ記載
- terms.tsv: 歴史用語データ
- relations.tsv: リレーションデータ
- 確認方法: SELECT COUNT(*) FROM terms;
```

**理由：**
- 「どうせまた次回忘れるだろ」- データは変わる、件数は古くなる
- 更新を忘れると、ドキュメントが嘘になる
- 確認方法だけ書けば十分

#### 2-2. ファイルを増やさない

**MUST**: 以下を避ける：

- ❌ 2重管理（TSVとMDに同じデータを書く）
- ❌ 不要な中間ファイル（id_mapping.tsv等）
- ❌ 自動生成可能なレポート（data_quality_report.md等）

**単一の情報源を維持する：**
- データの実体: TSVファイル
- ドキュメント: スキーマ定義と使い方のみ
- 統計・件数: SQL実行時に確認

### 3. 失敗時の対応 ⚠️ **最重要**

**MUST**: ミスや失敗をしたら即座に：

1. **fix-documentationスキルを使う**
   ```
   Skill(fix-documentation)
   ```
   - 関連ドキュメントに改善提案を自動追加

2. **Serenaメモリに記録**
   - `湧心くんの指摘_失敗と教訓の全記録` メモリに追記
   - 何が起きたか、原因、対応を記録

### 4. タスク完了時の対応 ⚠️ **最重要**

**MUST**: タスクを完了したら：

1. **Notionで完了にすることを提案**
   - 「〇〇タスクをNotionで完了にしますか？」と確認
   - 承認後、`use-notion`スキルでステータス更新

### 5. ユーザー指示の厳守 ⚠️ **最重要**

**MUST**: ユーザーの指示通りのツール・方法を使用する

**絶対に守ること：**
- ユーザーが「〇〇で調べて」と指示したら、そのツールを使う
- 「早いから」「便利だから」という理由で勝手に別のツールに変更しない
- 指示と異なるツールを使いたい場合は、必ずユーザーに確認してから使う

**例：**
```
❌ NG
ユーザー: 「geminiで使い方調べて」
Claude: WebSearchを使う（勝手な判断）

✅ OK
ユーザー: 「geminiで使い方調べて」
Claude: geminiを使う（指示通り）

✅ OK（代替案を提案する場合）
ユーザー: 「geminiで使い方調べて」
Claude: 「geminiのレート制限があるので、WebSearchを使ってもいいですか？」と確認
```

**理由：**
- ユーザーの意図を尊重する
- ツールごとに異なる情報源・結果が得られる
- 「口約束」ではなく、ルールとして明文化

**違反した場合：**
1. Serenaメモリ「湧心くんの指摘_失敗と教訓の全記録」に記録
2. このCLAUDE.mdを再読してルールを再確認

### 6. 推測の禁止 ⚠️ **最重要**

**MUST**: 不明なことは不明と言う。推測で答えない。

**絶対に守ること：**
- 存在しないオプションやコマンドを推測で提案しない
- 「たぶん〇〇で動くはず」という推測で進めない
- ドキュメントにない機能は「確認できませんでした」と正直に答える
- 不明な場合は、調査方法を提案するか、ユーザーに確認を求める

**例：**
```
❌ NG
ユーザー: 「no-browserオプションのソースは？」
Claude: 「--no-browserオプションで無効化できます」（推測で答える）

✅ OK
ユーザー: 「no-browserオプションのソースは？」
Claude: 「公式ドキュメントを確認しましたが、--no-browserオプションは見つかりませんでした。
       設定ファイルのweb_dashboard_open_on_launch: falseが正しい方法です」
```

**理由：**
- 推測で答えると、存在しない機能を提案してしまう
- ユーザーの時間を無駄にする
- 信頼を失う

**違反した場合：**
1. Serenaメモリ「湧心くんの指摘_失敗と教訓の全記録」に記録
2. このCLAUDE.mdを再読してルールを再確認

---

## 技術仕様

### データベース操作

- **Docker環境**: PostgreSQL 16 (Alpine)
- **接続情報**:
  ```bash
  # Docker内から
  docker compose exec postgres psql -U histlink_user -d histlink

  # ホストから（psqlインストール済みの場合）
  PGPASSWORD=histlink_dev_password psql -h localhost -p 5432 -U histlink_user -d histlink
  ```
- **マイグレーション**: `database/migrations/` に番号付きSQLファイル
  - 命名規則: `001_create_tables.sql`, `002_seed_data.sql`, etc.

#### ⚠️ TSVファイル更新時の必須作業

**MUST**: `data/terms.tsv` または `data/relations.tsv` を更新したら、**必ず以下を実行**：

```bash
# 1. データベース再構築（DROP SCHEMA CASCADE → 完全再構築）
./scripts/update_migration.sh

# 2. データ品質チェック
cd backend && pytest tests/test_data_quality.py -v

# 3. 全テスト実行
pytest tests/ -v
```

**理由：**
- TSVファイルが単一の情報源（Single Source of Truth）
- データベースとTSVが乖離すると、テスト失敗や不整合が発生
- `update_migration.sh` は既存スキーマを完全削除してから再構築するため安全

---

## データ設計規約

### 用語（Terms）
- **ID範囲**: 日本史 1-100、西洋史 101-200
- **必須フィールド**: id, name, era, tags
- **Era値**: 古代, 中世, 近世, 近代, 現代
- **データソース**: `data/terms.tsv` (TSV形式、タブ区切り)

### リレーション（Relations）
- **制約**:
  - `src_id ≠ dst_id` （自己ループ禁止）
  - すべての用語は `degree ≥ 2` （孤立ノード禁止）
- **タイプ**: 因果, 契機, 対立, 政策, 文化, 同時代, 外交
- **日本西洋史接点**: 限定的な接続（10-20件）で隘路を設計
- **データソース**: `data/relations.tsv` (TSV形式、タブ区切り)

### データフロー

```
data/*.tsv (唯一の真実)
    ↓
scripts/update_migration.sh (DB完全再構築)
    ↓
PostgreSQL (Docker)
    ↓
backend/app/ (FastAPI)
    ↓
frontend/ (React)
```

---

## フロントエンド設計

### 状態管理（Zustand）

**ストア構造:**
- `stores/gameStore.ts`: ゲーム状態の一元管理
  - lives, score, chain, stage, timer, difficulty
  - startGame, answerQuestion, resetGame アクション

**テスト戦略:**
- 各ストアに対応する `__tests__/` ファイル
- カバレッジ100%を目標

### コンポーネント設計

**ディレクトリ構造:**
```
frontend/src/
├── components/         # 再利用可能なコンポーネント
│   ├── GameHeader.tsx
│   ├── ResultHeader.tsx  # GameHeaderの亜種
│   ├── ChoiceCard.tsx
│   ├── RankingTable.tsx
│   ├── NameInputModal.tsx
│   └── __tests__/
├── pages/             # ページコンポーネント
│   ├── SelectPage.tsx
│   ├── GamePage.tsx
│   ├── ResultPage.tsx
│   └── __tests__/
└── stores/            # Zustandストア
    ├── gameStore.ts
    └── __tests__/
```

**画面遷移:**
- ルーティングライブラリ不使用
- App.tsx内で条件分岐レンダリング
- Select → Game → Result の3画面遷移

**テーマ設計:**
- ライトテーマ
- primary: #90EE90（ライトグリーン）
- error: #FF6B6B（ライトレッド）

### TDD実装ルール

**Test-Driven Development:**
- Red → Green → Refactor のサイクル厳守
- コンポーネント実装前にテストファイル作成
- カバレッジ100%を基本方針とする

**テストファイル命名:**
- `components/__tests__/ComponentName.test.tsx`
- `stores/__tests__/storeName.test.ts`
- `pages/__tests__/PageName.test.tsx`

---

## タスク管理

- **Notion連携**: `use-notion` スキル経由でタスク管理
- **Todo管理**: Claude Code の TodoWrite ツール使用
