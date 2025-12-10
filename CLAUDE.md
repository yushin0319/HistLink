# CLAUDE.md

Claude Code向けガイドライン

## 重要ルール

### ファイル作成前に確認
新しいファイル作成前に必ずユーザーに確認：ファイル名、配置場所、既存ファイルとの統合可能性

### ドキュメントに件数を書かない
具体的な件数・数値をハードコードしない。確認方法のみ記載。

### 推測で答えない
不明なことは「確認できませんでした」と正直に答える。

### 失敗時の対応
1. `fix-documentation`スキルで改善提案を追加
2. Serenaメモリ「湧心くんの指摘_失敗と教訓の全記録」に記録

### タスク完了時
「〇〇タスクをNotionで完了にしますか？」と確認

---

## データ設計

### JSONが唯一の真実
- `data/terms.json`: 用語データ（id, name, tier, category, description）
- `data/edges.json`: エッジデータ（id, term_a, term_b, difficulty, keyword, description）

### 難易度システム
| 難易度 | Tier制限 | エッジ制限 |
|--------|----------|------------|
| easy | Tier1のみ | easyのみ |
| normal | Tier1-2 | easy, normal |
| hard | 全Tier | 全エッジ |

---

## API設計

フロントエンド主体設計：ゲーム開始時に全ルート+全選択肢を一括返却

- `POST /api/v1/games/start`: ゲーム開始
- `POST /api/v1/games/{game_id}/result`: 結果送信
- `GET /api/v1/games/rankings`: ランキング取得

---

## タスク管理

- Notion: `use-notion`スキル
- Todo: TodoWriteツール
