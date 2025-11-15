# CLAUDE.md (HistLink Project)

## プロジェクト概要

**HistLink** - 日本史・西洋史の用語を連鎖的につなぐ歴史学習ゲーム

### 技術スタック
- **Backend**: Python (FastAPI)
- **Database**: PostgreSQL (Docker)
- **Frontend**: TypeScript + React (予定)

### ディレクトリ構造
```
HistLink/
├── backend/                  # Pythonバックエンド
├── database/                 # DBマイグレーション・スクリプト
│   ├── migrations/           # SQLマイグレーションファイル
│   └── scripts/              # データ品質チェックなど
├── data/                     # データファイル（MD形式）
│   ├── terms.md              # 全用語リスト（200語）
│   ├── relations.md          # 全リレーション（675件、統計とSQL）
│   └── data_quality_report.md # データ品質レポート
└── .serena/                  # Serena設定・メモリ・失敗記録
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

### 2. 失敗時の対応 ⚠️ **最重要**

**MUST**: ミスや失敗をしたら即座に：

1. **fix-documentationスキルを使う**
   ```
   Skill(fix-documentation)
   ```
   - 関連ドキュメントに改善提案を自動追加

2. **Serenaメモリに記録**
   - `湧心くんの指摘_失敗と教訓の全記録` メモリに追記
   - 何が起きたか、原因、対応を記録

### 3. タスク完了時の対応 ⚠️ **最重要**

**MUST**: タスクを完了したら：

1. **Notionで完了にすることを提案**
   - 「〇〇タスクをNotionで完了にしますか？」と確認
   - 承認後、`use-notion`スキルでステータス更新

### 4. データベース操作

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

### 5. データ設計規約

#### 用語（Terms）
- **ID範囲**:
  - 日本史: 1-100
  - 西洋史: 101-200
- **必須フィールド**: id, name, era, tags
- **Era値**: 古代, 中世, 近世, 近代, 現代

#### リレーション（Relations）
- **制約**:
  - src_id ≠ dst_id（自己ループ禁止）
  - すべての用語はdegree ≥ 2（孤立ノード禁止）
- **タイプ**: 因果, 契機, 対立, 政策, 文化, 同時代, 外交
- **日本西洋史接点**: 限定的な接続（10-20件）で隘路を設計

---

## タスク管理

- **Notion連携**: `use-notion` スキル経由でタスク管理
- **Todo管理**: Claude Code の TodoWrite ツール使用

---

## データ品質チェック

定期的に以下を実行：

```bash
# SQL品質チェック
psql -f database/scripts/check_data_quality.sql

# Python自動テスト
pytest backend/tests/test_data_quality.py -v
```

---

## 参考

- 失敗記録: `.serena/failures/`
- メモリ: `.serena/memories/`
