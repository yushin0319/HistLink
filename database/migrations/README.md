# マイグレーションファイル管理

## ファイル構成

- `001_create_tables.sql` - 統合マイグレーション（全テーブル定義 + データ）

## TSVからSQLを再生成する場合

`data/terms.tsv` または `data/relations.tsv` を更新した場合、以下の手順でSQLを再生成してください。

### ⚠️ 重要：文字コード対策

**Git Bash環境では、Pythonスクリプトで直接ファイルを開くと日本語が文字化けします。**

必ず以下のルールを守ってください：

#### 1. Pythonスクリプトの書き方

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-  # ← 必須
import sys

for line in sys.stdin:  # ← stdin経由で読み込み（ファイル直接読み込みNG）
    line = line.rstrip('\n\r')
    # ...
    print(sql, flush=True)  # ← 明示的にflush
```

#### 2. 実行コマンド

```bash
# ✅ 正しい方法（パイプ経由）
tail -n +2 data/relations.tsv | python script.py > output.sql

# ❌ 間違った方法（ファイル直接開く）
python script.py data/relations.tsv > output.sql  # 文字化けする
```

### なぜパイプ経由だと動くのか

Git Bash環境では：
- パイプ経由 → シェルのUTF-8エンコーディングが適用される
- ファイル直接開く → Pythonのデフォルトエンコーディング（CP932等）が使われる

## マイグレーション実行

```bash
# DBリセット + マイグレーション
cd HistLink
docker compose exec -T postgres psql -U histlink_user -d postgres -c "DROP DATABASE IF EXISTS histlink;"
docker compose exec -T postgres psql -U histlink_user -d postgres -c "CREATE DATABASE histlink;"
docker compose exec -T postgres psql -U histlink_user -d histlink < database/migrations/001_create_tables.sql
```

## データ検証

```sql
-- 件数確認
SELECT COUNT(*) FROM terms;     -- 210件
SELECT COUNT(*) FROM relations;  -- 714件

-- デッドポイント確認（min_degree >= 2 であること）
SELECT
  MIN(degree) AS min_degree,
  MAX(degree) AS max_degree,
  AVG(degree) AS avg_degree
FROM (
  SELECT
    t.id,
    (SELECT COUNT(*) FROM relations WHERE src_id = t.id) +
    (SELECT COUNT(*) FROM relations WHERE dst_id = t.id) AS degree
  FROM terms t
) sub;
```
