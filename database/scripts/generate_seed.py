#!/usr/bin/env python3
"""
JSONファイルからseed.sqlを生成するスクリプト

使用方法:
    python generate_seed.py

入力:
    ../../data/terms.json
    ../../data/edges.json

出力:
    ../seed.sql
"""

import json
from pathlib import Path


def escape_sql(value: str) -> str:
    """SQL文字列用にエスケープ"""
    if value is None:
        return ""
    return value.replace("'", "''")


def generate_seed():
    # パス設定
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "data"
    output_path = script_dir.parent / "seed.sql"

    # terms.json読み込み
    with open(data_dir / "terms.json", "r", encoding="utf-8") as f:
        terms_data = json.load(f)

    # edges.json読み込み
    with open(data_dir / "edges.json", "r", encoding="utf-8") as f:
        edges_data = json.load(f)

    # SQL生成
    lines = [
        "-- HistLink Seed Data",
        "-- Generated from JSON files",
        "",
        "-- terms データ",
        ""
    ]

    # terms INSERT
    for term in terms_data["terms"]:
        name = escape_sql(term["name"])
        category = escape_sql(term["category"])
        description = escape_sql(term.get("description", ""))
        lines.append(
            f"INSERT INTO terms (id, name, tier, category, description) "
            f"VALUES ({term['id']}, '{name}', {term['tier']}, '{category}', '{description}');"
        )

    lines.extend([
        "",
        "-- edges データ",
        ""
    ])

    # edges INSERT
    for edge in edges_data["edges"]:
        keyword = escape_sql(edge.get("keyword", ""))
        description = escape_sql(edge.get("description", ""))
        # term_a < term_b を保証
        term_a = min(edge["term_a"], edge["term_b"])
        term_b = max(edge["term_a"], edge["term_b"])
        lines.append(
            f"INSERT INTO edges (id, term_a, term_b, difficulty, keyword, description) "
            f"VALUES ({edge['id']}, {term_a}, {term_b}, '{edge['difficulty']}', '{keyword}', '{description}');"
        )

    # シーケンスリセット
    max_term_id = max(t["id"] for t in terms_data["terms"])
    max_edge_id = max(e["id"] for e in edges_data["edges"])
    lines.extend([
        "",
        "-- シーケンスをリセット（次のINSERTで使用）",
        f"-- SELECT setval('terms_id_seq', {max_term_id}, true);",
        f"-- SELECT setval('edges_id_seq', {max_edge_id}, true);",
        ""
    ])

    # ファイル出力
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated {output_path}")
    print(f"  Terms: {len(terms_data['terms'])} records")
    print(f"  Edges: {len(edges_data['edges'])} records")


if __name__ == "__main__":
    generate_seed()
