# HistLink

歴史用語をつなげるクイズゲーム

## セットアップ

```bash
docker compose up -d
```

## データベース

### 初期化（クリーンスタート）
```bash
# ボリューム削除して再作成
docker compose down -v
docker compose up -d
```

### スキーマ変更時
1. `database/schema.sql` を編集
2. 上記の初期化を実行

### データ追加・変更時
1. `data/terms.json` または `data/edges.json` を編集
2. seed.sql を再生成:
   ```bash
   node database/scripts/generate_seed.js
   ```
3. 上記の初期化を実行

## テスト

### バックエンド
```bash
docker compose exec backend python -m pytest
```

### フロントエンド
```bash
docker compose exec frontend npm test
```

## 難易度システム

| 難易度 | Tier制限 | エッジ制限 |
|--------|----------|------------|
| easy   | Tier1のみ | easyのみ |
| normal | Tier1-2  | easy, normal |
| hard   | 全Tier   | 全エッジ |
