# データ管理

## ファイル構成

- `terms.tsv` - 歴史用語データ
- `relations.tsv` - リレーションデータ
- `terms.md` - terms.tsvのスキーマ定義
- `relations.md` - relations.tsvのスキーマ定義

## データ追加・更新のワークフロー

### 1. TSVファイルを編集

```bash
# 用語を追加する場合
vim data/terms.tsv

# リレーションを追加する場合
vim data/relations.tsv
```

**注意点：**
- TSVファイルはタブ区切り（スペースではない）
- terms.tsv: `id	name	era	year	tags`
- relations.tsv: `src_id	dst_id	relation_type	keyword	explanation`

### 2. SQL INSERTステートメントを生成

**⚠️ 重要：Git Bash環境では必ずパイプ経由で実行すること**

#### terms用SQLの生成

```bash
cd HistLink

# Pythonスクリプト作成（初回のみ）
cat > tmp_generate_terms_sql.py << 'EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json

print("-- TERMS DATA", flush=True)

for line in sys.stdin:
    line = line.rstrip('\n\r')
    if not line:
        continue

    parts = line.split('\t')
    if len(parts) != 5:
        continue

    id_val, name, era, year, tags_json = parts

    # エスケープ処理
    name = name.replace("'", "''")
    era = era.replace("'", "''")

    # tagsをJSON配列からPostgreSQL配列リテラルに変換
    try:
        tags_list = json.loads(tags_json)
        escaped_tags = []
        for tag in tags_list:
            tag_escaped = tag.replace('\\', '\\\\').replace('"', '\\"')
            if ',' in tag or ' ' in tag or '"' in tag:
                escaped_tags.append(f'"{tag_escaped}"')
            else:
                escaped_tags.append(tag_escaped)
        pg_array = '{' + ','.join(escaped_tags) + '}'
    except:
        pg_array = '{}'

    sql = f"INSERT INTO terms (id, name, era, year, tags) VALUES ({id_val}, '{name}', '{era}', {year}, '{pg_array}'::text[]);"
    print(sql, flush=True)
EOF

# SQL生成（パイプ経由で実行 - 必須！）
tail -n +2 data/terms.tsv | python tmp_generate_terms_sql.py > /tmp/terms_insert.sql
```

#### relations用SQLの生成

```bash
# Pythonスクリプト作成（初回のみ）
cat > tmp_generate_relations_sql.py << 'EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys

print("-- RELATIONS DATA", flush=True)

counter = 1
for line in sys.stdin:
    line = line.rstrip('\n\r')
    if not line:
        continue

    parts = line.split('\t')
    if len(parts) != 5:
        continue

    src_id, dst_id, relation_type, keyword, explanation = parts

    # エスケープ処理
    relation_type = relation_type.replace("'", "''")
    keyword = keyword.replace("'", "''")
    explanation = explanation.replace("'", "''")

    sql = f"INSERT INTO relations (id, src_id, dst_id, relation_type, keyword, explanation) VALUES ({counter}, {src_id}, {dst_id}, '{relation_type}', '{keyword}', '{explanation}');"
    print(sql, flush=True)

    counter += 1
EOF

# SQL生成（パイプ経由で実行 - 必須！）
tail -n +2 data/relations.tsv | python tmp_generate_relations_sql.py > /tmp/relations_insert.sql
```

### 3. マイグレーションファイルを更新

```bash
cd database/migrations

# 新しいマイグレーションファイルを生成
{
  # Part 1: テーブル定義 (1-188行)
  head -188 001_create_tables.sql

  echo ""
  echo "-- DATA INSERTION"
  echo ""

  # Part 2: terms データ
  cat /tmp/terms_insert.sql

  echo ""

  # Part 3: relations データ
  cat /tmp/relations_insert.sql

  echo ""

  # Part 4: GAMES TABLE以降 (1092行から最後まで)
  tail -n +1092 001_create_tables.sql
} > 001_create_tables_new.sql

# 古いファイルをバックアップして置き換え
mv 001_create_tables.sql 001_create_tables.sql.bak
mv 001_create_tables_new.sql 001_create_tables.sql
```

**注意：** 行番号（188, 1092）はテーブル定義の行数によって変わる可能性あり。
`grep -n "-- DATA INSERTION"` や `grep -n "-- GAMES TABLE"` で確認すること。

### 4. データベースに反映

```bash
cd ../..  # HistLinkディレクトリに戻る

# DBリセット
docker compose exec -T postgres psql -U histlink_user -d postgres -c "DROP DATABASE IF EXISTS histlink;"
docker compose exec -T postgres psql -U histlink_user -d postgres -c "CREATE DATABASE histlink;"

# マイグレーション実行
docker compose exec -T postgres psql -U histlink_user -d histlink < database/migrations/001_create_tables.sql
```

### 5. データ検証

```bash
docker compose exec -T postgres psql -U histlink_user -d histlink << 'SQL'
-- 件数確認
SELECT COUNT(*) FROM terms;
SELECT COUNT(*) FROM relations;

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
SQL
```

**確認ポイント：**
- termsとrelationsの件数が正しく増えているか
- min_degree が 2以上であること（全用語が最低2本の接続を持つこと）

### 6. クリーンアップ

```bash
# バックアップファイル削除（動作確認後）
rm database/migrations/001_create_tables.sql.bak

# 一時ファイル削除
rm tmp_generate_terms_sql.py tmp_generate_relations_sql.py
```

## トラブルシューティング

### 日本語が文字化けする

**原因：** Pythonスクリプトでファイルを直接開いている

**解決策：** 必ずパイプ経由で実行する

```bash
# ❌ NG - ファイル直接読み込み
python script.py data/relations.tsv > output.sql

# ✅ OK - パイプ経由
tail -n +2 data/relations.tsv | python script.py > output.sql
```

### デッドポイント（degree < 2）が発生した

**原因：** 新しく追加した用語にリレーションが不足している

**解決策：**

1. デッドポイントを確認：

```sql
SELECT t.id, t.name, degree
FROM (
  SELECT t.id, t.name,
    (SELECT COUNT(*) FROM relations WHERE src_id = t.id) +
    (SELECT COUNT(*) FROM relations WHERE dst_id = t.id) AS degree
  FROM terms t
) t
WHERE degree < 2
ORDER BY degree, id;
```

2. `data/relations.tsv` に不足しているリレーションを追加
3. 上記のワークフロー（2〜5）を再実行

## 参考

詳細な文字コード対策については：
- `database/migrations/README.md`
- `database/migrations/001_create_tables.sql` の先頭コメント
