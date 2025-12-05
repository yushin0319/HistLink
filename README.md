# HistLink

歴史用語をつなげるクイズゲーム

## セットアップ

```bash
# Docker起動
docker compose up -d
```

## データベースマイグレーション

JSONデータからデータベースを再構築:

```bash
bash scripts/update_migration.sh
```

## テスト実行

```bash
# Docker内でテスト実行
docker compose exec backend python -m pytest tests/ -v
```

## テスト一覧

### データ品質 (test_data_quality.py)
- 死に点チェック（degree < 2のノードがないこと）
- 孤立ノードチェック
- 自己ループチェック
- 次数統計（最小2以上、平均3以上）
- Tier別分布・接続性
- 難易度多様性
- 重複リレーションチェック

### データベース接続 (test_database.py)
- DB接続確認
- terms/relationsテーブル存在確認
- データ読み取り確認

### ルート生成 (test_route_generator.py)
- 難易度フィルタ（easy/normal/hard）
- BFS距離計算
- スコアリング関数（未訪問近傍数、三角形ヒット）
- ルート生成（基本、孤立ノード、seed指定）
- ランダムスタート選択

### ダミー生成 (test_distractor_generator.py)
- 難易度別Tier制限（easy=Tier1、normal=Tier1-2、hard=全Tier）
- 2hop以上の距離制限
- 訪問済み除外
- seed指定による決定性

### ゲームAPI (test_games_api.py)
- ゲーム開始（全難易度）
- 選択肢品質（4択、正解含有）
- リレーション情報取得
- ゲーム結果送信
- エラーハンドリング

### その他
- ルートAPI (test_routes_api.py)
- ヘルスチェック (test_main.py)
- Hypothesisプロパティテスト (test_hypothesis_example.py)

## データ構造

### terms.json
```json
{
  "terms": [
    {
      "id": 1,
      "name": "用語名",
      "tier": 1,
      "category": "カテゴリ",
      "description": "説明文"
    }
  ]
}
```

### relations.json
```json
{
  "edges": [
    {
      "id": 1,
      "source": 1,
      "target": 2,
      "difficulty": "easy",
      "keyword": "キーワード",
      "explanation": "説明文"
    }
  ]
}
```

## 難易度システム

| 難易度 | Tier制限 | エッジ制限 |
|--------|----------|------------|
| easy   | Tier1のみ | easyのみ |
| normal | Tier1-2  | easy, normal |
| hard   | 全Tier   | 全エッジ |
