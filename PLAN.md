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
- relations: source, target, difficulty, keyword, explanation（約300KB）
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

1. **BE起動時**: terms, relations全件読み込み（1回だけ）
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
└── seed.sql        # 初期データ（terms, relations の INSERT）
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
- relation追加フォーム（source/target選択式）
- グラフ可視化（あれば嬉しい程度）

### 技術スタック
- Vite + React（ゲーム本体と同じ構成）
- Supabase直結（supabase-js使用）

---

## 命名統一計画

### 背景
FE/BE/DB/JSONで命名がバラバラになっている箇所があり、統一が必要。

### 変更概要

#### 1. テーブル名変更
| 現在 | 変更後 | 理由 |
|------|--------|------|
| `relations` | `edges` | グラフ理論の用語として自然 |

#### 2. edgesテーブルのカラム名変更
| 現在 | 変更後 | 理由 |
|------|--------|------|
| `source` | `term_a` | 双方向エッジなので方向性のない命名に |
| `target` | `term_b` | 同上 |
| `explanation` | `description` | termsと統一 |

```sql
CREATE TABLE edges (
    id INTEGER PRIMARY KEY,
    term_a INTEGER NOT NULL REFERENCES terms(id),
    term_b INTEGER NOT NULL REFERENCES terms(id),
    difficulty VARCHAR(20) NOT NULL,
    keyword VARCHAR(100),
    description TEXT,
    CHECK (term_a < term_b)  -- 重複防止: 常にa < bで登録
);
```

#### 3. FE型定義の修正（types/api.ts）
| 現在 | 変更後 | 理由 |
|------|--------|------|
| `Term.era` | `Term.category` | DBと統一 |
| `Choice.era` | `Choice.tier` | 実際に使う値はtier |
| `RouteStepWithChoices.relation_type` | `RouteStepWithChoices.difficulty` | DBと統一 |
| `RouteStepWithChoices.relation_description` | `RouteStepWithChoices.description` | シンプルに |

#### 4. BE修正
| ファイル | 現在 | 変更後 |
|----------|------|--------|
| `schemas/game.py` | `edge_difficulty` | `difficulty` |
| `schemas/game.py` | `relation_description` | `description` |
| `routes/games.py` | SQLで `source`/`target` | `term_a`/`term_b` |
| `services/route_generator.py` | SQLで `source`/`target` | `term_a`/`term_b` |

#### 5. JSONデータ修正（data/relations.json → data/edges.json）
| 現在 | 変更後 |
|------|--------|
| `source` | `term_a` |
| `target` | `term_b` |
| `explanation` | `description` |

#### 6. 削除対象（未使用）
- `FE: Term.tags`
- `FE: RouteStep.relation_type`
- `DB: route_steps.from_relation_type`

### 統一後の命名一覧

#### terms
| DB | JSON | BE Schema | FE Types |
|----|------|-----------|----------|
| `id` | `id` | `id` | `id` |
| `name` | `name` | `name` | `name` |
| `tier` | `tier` | `tier` | `tier` |
| `category` | `category` | `category` | `category` |
| `description` | `description` | `description` | `description` |

#### edges（旧relations）
| DB | JSON | BE使用 | FE Types |
|----|------|--------|----------|
| `id` | `id` | - | - |
| `term_a` | `term_a` | `term_a` | - |
| `term_b` | `term_b` | `term_b` | - |
| `difficulty` | `difficulty` | `difficulty` | `difficulty` |
| `keyword` | `keyword` | `keyword` | `keyword` |
| `description` | `description` | `description` | `description` |

---

## 次のステップ

1. **命名統一**（本計画を実行）
2. BEキャッシュ実装（起動時にterms/edges読み込み）
3. gamesテーブル新設計に変更（terms[], false_steps[]追加）
4. routes, route_steps, route_distractors削除
5. 動作確認
6. Supabaseプロジェクト作成 → スキーマ流し込み
