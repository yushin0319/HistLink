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

注意: generate_seed.js は削除済み。このPythonスクリプトのみを使用すること。
"""

import json
import sys
from pathlib import Path


def escape_sql(value: str | None) -> str:
    """SQL文字列用にエスケープ"""
    if value is None:
        return ""
    return value.replace("'", "''")


def load_data(data_dir: Path) -> tuple[list[dict], list[dict]]:
    """terms.json と edges.json を読み込む"""
    terms_path = data_dir / "terms.json"
    edges_path = data_dir / "edges.json"

    if not terms_path.exists():
        raise FileNotFoundError(f"terms.json not found: {terms_path}")
    if not edges_path.exists():
        raise FileNotFoundError(f"edges.json not found: {edges_path}")

    with open(terms_path, "r", encoding="utf-8") as f:
        terms_data = json.load(f)
    with open(edges_path, "r", encoding="utf-8") as f:
        edges_data = json.load(f)

    return terms_data["terms"], edges_data["edges"]


def generate_terms_sql(terms: list[dict]) -> list[str]:
    """termsのINSERT文リストを生成"""
    lines: list[str] = ["-- terms データ", ""]
    for term in terms:
        name = escape_sql(term["name"])
        category = escape_sql(term["category"])
        description = escape_sql(term.get("description", ""))
        lines.append(
            f"INSERT INTO terms (id, name, tier, category, description) "
            f"VALUES ({term['id']}, '{name}', {term['tier']}, '{category}', '{description}');"
        )
    return lines


def generate_edges_sql(edges: list[dict]) -> list[str]:
    """edgesのINSERT文リストを生成"""
    lines: list[str] = ["-- edges データ", ""]
    for edge in edges:
        keyword = escape_sql(edge.get("keyword", ""))
        description = escape_sql(edge.get("description", ""))
        # term_a < term_b を保証
        term_a = min(edge["term_a"], edge["term_b"])
        term_b = max(edge["term_a"], edge["term_b"])
        lines.append(
            f"INSERT INTO edges (id, term_a, term_b, difficulty, keyword, description) "
            f"VALUES ({edge['id']}, {term_a}, {term_b}, '{edge['difficulty']}', '{keyword}', '{description}');"
        )
    return lines


def generate_sequence_reset_sql() -> list[str]:
    """シーケンスリセットSQL行を生成"""
    return [
        "-- IDENTITYシーケンスをシードデータの最大IDに合わせてリセット",
        "-- これにより次のINSERT（id省略時）がシードデータと衝突しなくなる",
        "SELECT setval(pg_get_serial_sequence('terms', 'id'), (SELECT MAX(id) FROM terms));",
        "SELECT setval(pg_get_serial_sequence('edges', 'id'), (SELECT MAX(id) FROM edges));",
    ]


def generate_seed() -> None:
    """seed.sqlを生成するメイン関数"""
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "data"
    output_path = script_dir.parent / "seed.sql"

    terms, edges = load_data(data_dir)

    lines: list[str] = [
        "-- HistLink Seed Data",
        "-- Generated from JSON files",
        "",
    ]
    lines.extend(generate_terms_sql(terms))
    lines.append("")
    lines.extend(generate_edges_sql(edges))
    lines.append("")
    lines.extend(generate_sequence_reset_sql())
    lines.append("")  # 末尾改行

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated {output_path}")
    print(f"  Terms: {len(terms)} records")
    print(f"  Edges: {len(edges)} records")


if __name__ == "__main__":
    try:
        generate_seed()
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyError as e:
        print(f"Error: missing key in JSON data: {e}", file=sys.stderr)
        sys.exit(1)
