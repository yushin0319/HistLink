# HistLink 開発計画

## 開発方針

「作っててわくわくする」を大事に、楽しみながら開発する

- テストを書くことで安心してリファクタリング
- 小さく動くものを作って積み上げる
- コードの品質を保ちながら楽しく開発

---

## アーキテクチャ

```
Supabase (PostgreSQL)
    ↑
    ├── histlink-be (Render) ← ゲームAPI
    │       ↑
    │   histlink (Render) ← ゲームFE
    │
    └── histlink-admin (Render) ← 管理画面（Supabase直結）
```

### 環境構成

| 環境 | DB | 用途 |
|------|-----|------|
| 本番 | Supabase | ユーザー向けサービス |
| 開発 | Docker (PostgreSQL) | ローカル開発・テスト |

---

## データフロー設計

### 現状の問題
- 1ゲーム50ステップで300〜500クエリがDBに飛んでいる
- routes + route_steps + gamesで1ゲーム11レコード生成
- route_distractorsテーブルは未使用

### 解決策：BEキャッシュ + テーブル簡略化

#### 1. BEメモリキャッシュ（起動時に全件読み込み）

- terms: id, name, tier, category, description（約120KB）
- edges: term_a, term_b, difficulty, keyword, description（約300KB）
- 合計約400KB - BEメモリには余裕

#### 2. テーブル構成の変更

**【削除】** routes, route_steps, route_distractors

**【変更】** gamesテーブル（1ゲーム = 1レコードに統合）

```sql
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text,
  difficulty text,
  terms integer[],           -- ルートの用語ID配列
  score integer,
  lives integer,
  is_finished boolean,
  false_steps integer[],     -- 間違えたステップ番号の配列（最大3要素）
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3. 新しいフロー

1. **BE起動時**: terms, edges全件読み込み（1回だけ）
2. **ゲーム開始**: キャッシュからルート生成（DB 0回）→ レスポンス返却
3. **ゲーム終了**: gamesテーブルにINSERT 1回 + ランキング取得2-3回

#### 4. 効果

- DBクエリ: 300〜500回 → 3〜4回
- レコード数: 11レコード → 1レコード
- レスポンス速度: 10〜100倍高速化

---

## データ管理

### ファイル構成

```
database/
├── schema.sql      # テーブル定義（CREATE TABLE）
└── seed.sql        # 初期データ（terms, edges の INSERT）
```

### 運用フロー

**初期構築:**
1. Supabase管理画面のSQL Editorで `schema.sql` 実行
2. 同じく `seed.sql` 実行

**データ追加・編集:**
- Supabase管理画面から直接操作
- または histlink-admin（管理画面アプリ）から操作

**ローカル開発:**
```bash
# 本番(Supabase)からダンプ
pg_dump -h xxx.supabase.co -U postgres -d postgres > dump.sql

# ローカル(Docker)にリストア
docker exec -i histlink-db psql -U postgres -d histlink < dump.sql
```

---

## 管理画面（histlink-admin）

### 機能
- term一覧（各tierごとのエッジ数表示）
- 「t1なのにeasyエッジ2本未満」みたいな警告表示
- edge追加フォーム（term_a/term_b選択式）
- グラフ可視化（あれば嬉しい程度）

### 技術スタック
- Vite + React（ゲーム本体と同じ構成）
- Supabase直結（supabase-js使用）

---

## 命名統一（✅ 完了）

FE/BE/JSONの命名を統一済み。DBマイグレーションはSupabase移行時に対応。

### 統一後の命名

#### terms
| JSON | BE | FE |
|------|-----|-----|
| `id`, `name`, `tier`, `category`, `description` | 同左 | 同左 |

#### edges
| JSON | BE | FE |
|------|-----|-----|
| `term_a`, `term_b`, `difficulty`, `keyword`, `description` | 同左 | `difficulty`, `keyword`, `edge_description` |

---

## 次のステップ

### Phase 1: FEリザルト画面改修
- gameStoreに`falseSteps: number[]`追加（間違えたステップ番号を記録）
- リザルト画面で間違えたステップを色分け表示
- 非コンプリート（ゲームオーバー）時の表示改善

### Phase 2: BE最適化
- BEキャッシュ実装（起動時にterms/edges読み込み）
- gamesテーブル新設計（terms[], false_steps[]追加）
- routes, route_steps, route_distractors削除

### Phase 3: Supabase移行
- Supabaseプロジェクト作成
- スキーマ流し込み（新命名で）
- 動作確認
