# HistLink 開発計画

## 開発方針

「作っててわくわくする」を大事に、楽しみながら開発する

- テストを書くことで安心してリファクタリング
- 小さく動くものを作って積み上げる
- コードの品質を保ちながら楽しく開発

---

## 完成した機能 ✅

### フロントエンド（98% カバレッジ）

| 画面 | 機能 | 状態 |
|------|------|------|
| SelectPage | 難易度選択（かんたん/ふつう/難しい） | ✅ |
| SelectPage | ステージ数選択（10/30/50問） | ✅ |
| GamePage | 用語カード表示 | ✅ |
| GamePage | 4択選択肢 | ✅ |
| GamePage | タイマー（20秒、0.1秒単位） | ✅ |
| GamePage | ライフシステム（3ライフ） | ✅ |
| GamePage | スコア加算（残り時間ベース） | ✅ |
| GamePage | フィードバック表示（正解/不正解） | ✅ |
| GamePage | エッジ説明表示 | ✅ |
| ResultPage | ライフ→スコア換金アニメーション | ✅ |
| ResultPage | ランキング表示（X問/全体タブ） | ✅ |
| ResultPage | 名前編集機能 | ✅ |
| ResultPage | ルートおさらいモーダル | ✅ |

### バックエンド（93% カバレッジ）

| 機能 | エンドポイント | 状態 |
|------|---------------|------|
| ゲーム開始 | POST /games/start | ✅ |
| 結果送信 | POST /games/{id}/result | ✅ |
| 名前更新 | PATCH /games/{id} | ✅ |
| 全体ランキング | GET /games/rankings/overall | ✅ |
| BEキャッシュ | 起動時にterms/edges読み込み | ✅ |

---

## アーキテクチャ

### 現在（ローカル開発）

```
Docker (PostgreSQL)
    ↑
backend/ (FastAPI)
    ↑
frontend/ (React + Vite)
```

### 本番構成（予定）

```
Supabase (PostgreSQL)
    ↑
    ├── histlink-be (Render) ← ゲームAPI
    │       ↑
    │   histlink (Render) ← ゲームFE
    │
    └── histlink-admin (Render) ← 管理画面（Supabase直結）
```

---

## 次のステップ

### Phase 1: Supabase移行

- [ ] Supabaseプロジェクト作成
- [ ] スキーマ流し込み
- [ ] 接続情報の環境変数設定
- [ ] 動作確認

### Phase 2: デプロイ

- [ ] Render.comへのデプロイ設定
- [ ] フロントエンドビルド・デプロイ
- [ ] バックエンドデプロイ
- [ ] 本番動作確認

### Phase 3: 管理画面（histlink-admin）

- [ ] term一覧（各tierごとのエッジ数表示）
- [ ] 「t1なのにeasyエッジ2本未満」警告表示
- [ ] edge追加フォーム（term_a/term_b選択式）
- [ ] グラフ可視化（あれば嬉しい程度）

---

## データ設計

### gamesテーブル（1ゲーム = 1レコード）

```sql
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text,
  difficulty text,
  total_steps integer,
  terms integer[],           -- ルートの用語ID配列
  score integer,
  lives integer,
  is_finished boolean,
  false_steps integer[],     -- 間違えたステップ番号の配列
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### データフロー

1. **BE起動時**: terms, edges全件読み込み（1回だけ）
2. **ゲーム開始**: キャッシュからルート生成（DB 0回）→ レスポンス返却
3. **ゲーム終了**: gamesテーブルにINSERT 1回 + ランキング取得2-3回

---

## 命名規則

### terms

| フィールド | 説明 |
|-----------|------|
| id | 用語ID |
| name | 用語名 |
| tier | 難易度レベル |
| category | カテゴリ（時代など） |
| description | 説明文 |

### edges

| フィールド | 説明 |
|-----------|------|
| term_a, term_b | 接続する用語ID |
| difficulty | エッジの難易度 |
| keyword | キーワード |
| description | 説明文 |
