"""
データ品質チェックテスト（構造整合性）

死に点・孤立ノード・自己ループ・重複エッジ等の構造的な整合性を検証する。
統計・分布テストは test_data_quality_stats.py を参照。

スキーマ:
- terms: id, name, tier, category, description
- edges: id, term_a, term_b, difficulty, keyword, description
"""

import pytest
from sqlalchemy import text


def test_no_dead_points(db_session):
    """
    死に点（degree < 2）が存在しないことを確認

    ゲームの継続性を保証するため、すべての用語は最低2つのリレーションを持つ必要がある。
    """
    # 次数が2未満の用語を検索
    dead_points = db_session.execute(
        text("""
            SELECT t.id, t.name, t.tier, COUNT(e.id) as degree
            FROM terms t
            LEFT JOIN edges e ON (e.term_a = t.id OR e.term_b = t.id)
            GROUP BY t.id, t.name, t.tier
            HAVING COUNT(e.id) < 2
        """)
    ).fetchall()

    # 死に点がある場合は詳細を表示
    if len(dead_points) > 0:
        details = "\n".join([f"  - ID {dp.id}: {dp.name} (Tier {dp.tier}) - degree: {dp.degree}"
                            for dp in dead_points])
        pytest.fail(f"死に点が{len(dead_points)}個存在します:\n{details}")

    assert len(dead_points) == 0


def test_terms_exist(db_session):
    """
    用語が存在することを確認
    """
    count = db_session.execute(
        text("SELECT COUNT(*) FROM terms")
    ).scalar()

    assert count > 0, "用語が1件も存在しません"


def test_edges_exist(db_session):
    """
    エッジが存在することを確認
    """
    count = db_session.execute(
        text("SELECT COUNT(*) FROM edges")
    ).scalar()

    assert count > 0, "エッジが1件も存在しません"


def test_no_isolated_nodes(db_session):
    """
    孤立ノード（どこにも繋がっていないノード）が存在しないことを確認
    """
    result = db_session.execute(
        text("""
            SELECT COUNT(*)
            FROM terms t
            LEFT JOIN edges e ON (e.term_a = t.id OR e.term_b = t.id)
            WHERE e.id IS NULL
        """)
    ).scalar()

    # 孤立ノードがある場合は詳細を表示
    if result > 0:
        isolated = db_session.execute(
            text("""
                SELECT t.id, t.name, t.tier
                FROM terms t
                LEFT JOIN edges e ON (e.term_a = t.id OR e.term_b = t.id)
                WHERE e.id IS NULL
            """)
        ).fetchall()
        details = "\n".join([f"  - ID {n.id}: {n.name} (Tier {n.tier})" for n in isolated])
        pytest.fail(f"孤立ノードが{result}個存在します:\n{details}")

    assert result == 0, f"孤立ノードが{result}個存在します"


def test_no_self_loops(db_session):
    """
    自己ループ（term_a = term_b）が存在しないことを確認

    自己ループはゲームの進行を妨げるため、禁止されている。
    """
    result = db_session.execute(
        text("SELECT COUNT(*) FROM edges WHERE term_a = term_b")
    ).scalar()

    # 自己ループがある場合は詳細を表示
    if result > 0:
        self_loops = db_session.execute(
            text("""
                SELECT id, term_a, term_b, difficulty
                FROM edges
                WHERE term_a = term_b
            """)
        ).fetchall()
        details = "\n".join([f"  - Edge ID {r.id}: term_id={r.term_a}, difficulty={r.difficulty}"
                            for r in self_loops])
        pytest.fail(f"自己ループが{result}個存在します:\n{details}")

    assert result == 0, f"自己ループが{result}個存在します"


def test_duplicate_edges(db_session):
    """
    重複エッジが存在しないことを確認

    同じterm_a, term_bの組み合わせは1つのみ許可
    """
    duplicates = db_session.execute(
        text("""
            SELECT term_a, term_b, COUNT(*) AS dup_count
            FROM edges
            GROUP BY term_a, term_b
            HAVING COUNT(*) > 1
        """)
    ).fetchall()

    assert len(duplicates) == 0, \
        f"重複エッジが{len(duplicates)}個存在します"
