# リレーションデータ

`data/relations.tsv`

## カラム定義

- `src_id`: 元の用語ID
- `dst_id`: 先の用語ID
- `relation_type`: リレーションタイプ
- `keyword`: キーワード
- `explanation`: 説明

## 形式

```
src_id	dst_id	relation_type	keyword	explanation
```

## リレーションタイプ

- 因果: A→Bの直接的原因
- 契機: Aが引き金となってB
- 同時代: 同じ時代の関連事項
- 対立: AとBが対立関係
- 文化: 時代・人物の文化的成果
- 政策: 政策の結果
- 外交: 国際関係
