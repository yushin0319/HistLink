"""
データ品質チェックテスト（新仕様）

このテストモジュールは、データベースに格納されているデータの品質を検証します。
以下のチェックを実行します：
1. 死に点チェック（degree < 2のノードがないこと）
2. 用語数チェック
3. リレーション数チェック
4. 孤立ノードチェック（どこにも繋がっていないノード）
5. 自己ループチェック（source = target）
6. 次数統計チェック（最小次数が2以上）

新スキーマ:
- terms: id, name, tier, category, description
- relations: id, source, target, difficulty, keyword, explanation
"""

import pytest
from sqlalchemy import text


def test_no_dead_points(db_session):
    """
    死に点（degree < 2）が存在しないことを確認

    ゲームの継続性を保証するため、すべての用語は最低2つのリレーションを持つ必要がある。
    """
    result = db_session.execute(
        text("SELECT COUNT(*) FROM v_dead_points")
    ).scalar()

    # 死に点がある場合は詳細を表示
    if result > 0:
        dead_points = db_session.execute(
            text("SELECT id, name, tier, degree FROM v_dead_points")
        ).fetchall()
        details = "\n".join([f"  - ID {dp.id}: {dp.name} (Tier {dp.tier}) - degree: {dp.degree}"
                            for dp in dead_points])
        pytest.fail(f"死に点が{result}個存在します:\n{details}")

    assert result == 0, f"死に点が{result}個存在します"


def test_terms_exist(db_session):
    """
    用語が存在することを確認
    """
    count = db_session.execute(
        text("SELECT COUNT(*) FROM terms")
    ).scalar()

    assert count > 0, "用語が1件も存在しません"


def test_relations_exist(db_session):
    """
    リレーションが存在することを確認
    """
    count = db_session.execute(
        text("SELECT COUNT(*) FROM relations")
    ).scalar()

    assert count > 0, "リレーションが1件も存在しません"


def test_no_isolated_nodes(db_session):
    """
    孤立ノード（どこにも繋がっていないノード）が存在しないことを確認
    """
    result = db_session.execute(
        text("""
            SELECT COUNT(*)
            FROM terms t
            LEFT JOIN relations r ON (r.source = t.id OR r.target = t.id)
            WHERE r.id IS NULL
        """)
    ).scalar()

    # 孤立ノードがある場合は詳細を表示
    if result > 0:
        isolated = db_session.execute(
            text("""
                SELECT t.id, t.name, t.tier
                FROM terms t
                LEFT JOIN relations r ON (r.source = t.id OR r.target = t.id)
                WHERE r.id IS NULL
            """)
        ).fetchall()
        details = "\n".join([f"  - ID {n.id}: {n.name} (Tier {n.tier})" for n in isolated])
        pytest.fail(f"孤立ノードが{result}個存在します:\n{details}")

    assert result == 0, f"孤立ノードが{result}個存在します"


def test_no_self_loops(db_session):
    """
    自己ループ（source = target）が存在しないことを確認

    自己ループはゲームの進行を妨げるため、禁止されている。
    """
    result = db_session.execute(
        text("SELECT COUNT(*) FROM relations WHERE source = target")
    ).scalar()

    # 自己ループがある場合は詳細を表示
    if result > 0:
        self_loops = db_session.execute(
            text("""
                SELECT id, source, target, difficulty
                FROM relations
                WHERE source = target
            """)
        ).fetchall()
        details = "\n".join([f"  - Relation ID {r.id}: term_id={r.source}, difficulty={r.difficulty}"
                            for r in self_loops])
        pytest.fail(f"自己ループが{result}個存在します:\n{details}")

    assert result == 0, f"自己ループが{result}個存在します"


def test_degree_statistics(db_session):
    """
    次数の統計情報を確認

    - 最小次数が2以上（死に点なし）
    - 平均次数が3以上（十分なリレーション）
    """
    stats = db_session.execute(
        text("""
            SELECT
                MIN(degree) AS min_degree,
                MAX(degree) AS max_degree,
                AVG(degree) AS avg_degree
            FROM v_term_degrees
        """)
    ).fetchone()

    assert stats.min_degree >= 2, f"最小次数が{stats.min_degree}です（期待値: 2以上）"
    assert stats.avg_degree >= 3.0, f"平均次数が{stats.avg_degree:.2f}です（期待値: 3.0以上）"
    assert stats.max_degree <= 30, f"最大次数が{stats.max_degree}です（ハブノード対策: 30以下推奨）"


def test_tier_distribution(db_session):
    """
    Tier別の用語分布を確認

    各Tierに用語があることを確認
    """
    tier_counts = db_session.execute(
        text("""
            SELECT tier, COUNT(*) AS count
            FROM terms
            GROUP BY tier
            ORDER BY tier
        """)
    ).fetchall()

    for tier_count in tier_counts:
        assert tier_count.count >= 1, \
            f"Tier {tier_count.tier}の用語数が{tier_count.count}です（期待値: 1以上）"


def test_difficulty_diversity(db_session):
    """
    難易度の多様性を確認

    最低2種類以上の難易度（easy, normal, hard）が使われていることを確認
    """
    difficulty_count = db_session.execute(
        text("SELECT COUNT(DISTINCT difficulty) FROM relations")
    ).scalar()

    assert difficulty_count >= 2, \
        f"難易度が{difficulty_count}種類です（期待値: 2種類以上）"


def test_duplicate_relations(db_session):
    """
    重複リレーションが存在しないことを確認

    同じsource, targetの組み合わせは1つのみ許可
    """
    duplicates = db_session.execute(
        text("""
            SELECT source, target, COUNT(*) AS dup_count
            FROM relations
            GROUP BY source, target
            HAVING COUNT(*) > 1
        """)
    ).fetchall()

    assert len(duplicates) == 0, \
        f"重複リレーションが{len(duplicates)}個存在します"


@pytest.mark.parametrize("tier", [1, 2, 3])
def test_tier_connectivity(db_session, tier):
    """
    各Tierの用語が孤立していないことを確認

    各Tierの用語が他のTierの用語と少なくとも1つ以上繋がっていることを確認
    （Tierを跨いだゲームプレイを可能にするため）
    """
    # 指定されたTierの用語で、他のTierと繋がっているものの数
    connected_count = db_session.execute(
        text("""
            SELECT COUNT(DISTINCT t1.id)
            FROM terms t1
            JOIN relations r ON (r.source = t1.id OR r.target = t1.id)
            JOIN terms t2 ON (
                (r.source = t2.id AND r.target = t1.id) OR
                (r.target = t2.id AND r.source = t1.id)
            )
            WHERE t1.tier = :tier AND t2.tier != :tier
        """),
        {"tier": tier}
    ).scalar()

    # 指定されたTierの総用語数
    total_count = db_session.execute(
        text("SELECT COUNT(*) FROM terms WHERE tier = :tier"),
        {"tier": tier}
    ).scalar()

    # Tierに用語がある場合のみチェック
    if total_count > 0:
        connectivity_ratio = connected_count / total_count
        # 少なくとも10%以上の用語が他のTierと繋がっていることを期待
        assert connectivity_ratio >= 0.10, \
            f"Tier {tier}の用語のうち他のTierと繋がっているのは{connectivity_ratio:.1%}です（期待値: 10%以上）"


def test_data_quality_summary(db_session):
    """
    データ品質のサマリーを表示（常に成功するテスト）

    このテストは情報提供のためのもので、常に成功します。
    """
    # 用語数
    term_count = db_session.execute(text("SELECT COUNT(*) FROM terms")).scalar()

    # リレーション数
    relation_count = db_session.execute(text("SELECT COUNT(*) FROM relations")).scalar()

    # 次数統計
    degree_stats = db_session.execute(
        text("""
            SELECT
                MIN(degree) AS min_degree,
                MAX(degree) AS max_degree,
                ROUND(AVG(degree)::numeric, 2) AS avg_degree
            FROM v_term_degrees
        """)
    ).fetchone()

    # Tier別用語数
    tier_counts = db_session.execute(
        text("""
            SELECT tier, COUNT(*) AS count
            FROM terms
            GROUP BY tier
            ORDER BY tier
        """)
    ).fetchall()

    # 難易度別リレーション数
    difficulty_counts = db_session.execute(
        text("""
            SELECT difficulty, COUNT(*) AS count
            FROM relations
            GROUP BY difficulty
            ORDER BY
                CASE difficulty
                    WHEN 'easy' THEN 1
                    WHEN 'normal' THEN 2
                    WHEN 'hard' THEN 3
                END
        """)
    ).fetchall()

    # サマリー出力
    print("\n" + "="*50)
    print("データ品質サマリー")
    print("="*50)
    print(f"用語数: {term_count}")
    print(f"リレーション数: {relation_count}")
    if degree_stats.min_degree is not None:
        print(f"次数統計: 最小={degree_stats.min_degree}, 最大={degree_stats.max_degree}, 平均={degree_stats.avg_degree}")
    print("\nTier別用語数:")
    for tier_count in tier_counts:
        print(f"  Tier {tier_count.tier}: {tier_count.count}語")
    print("\n難易度別リレーション数:")
    for dc in difficulty_counts:
        print(f"  {dc.difficulty}: {dc.count}件")
    print("="*50)

    # このテストは常に成功
    assert True
