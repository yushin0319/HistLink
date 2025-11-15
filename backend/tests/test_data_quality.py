"""
データ品質チェックテスト

このテストモジュールは、データベースに格納されているデータの品質を検証します。
以下のチェックを実行します：
1. 死に点チェック（degree < 2のノードがないこと）
2. 用語数チェック（目標: 100語）
3. リレーション数チェック（目標: 300リレーション）
4. 孤立ノードチェック（どこにも繋がっていないノード）
5. 自己ループチェック（src_id = dst_id）
6. 次数統計チェック（最小次数が2以上）
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
            text("SELECT id, name, era, degree FROM v_dead_points")
        ).fetchall()
        details = "\n".join([f"  - ID {dp.id}: {dp.name} ({dp.era}) - degree: {dp.degree}"
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

    assert count > 0, f"用語が1件も存在しません"


def test_relations_exist(db_session):
    """
    リレーションが存在することを確認
    """
    count = db_session.execute(
        text("SELECT COUNT(*) FROM relations")
    ).scalar()

    assert count > 0, f"リレーションが1件も存在しません"


def test_no_isolated_nodes(db_session):
    """
    孤立ノード（どこにも繋がっていないノード）が存在しないことを確認
    """
    result = db_session.execute(
        text("""
            SELECT COUNT(*)
            FROM terms t
            LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
            WHERE r.id IS NULL
        """)
    ).scalar()

    # 孤立ノードがある場合は詳細を表示
    if result > 0:
        isolated = db_session.execute(
            text("""
                SELECT t.id, t.name, t.era
                FROM terms t
                LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
                WHERE r.id IS NULL
            """)
        ).fetchall()
        details = "\n".join([f"  - ID {n.id}: {n.name} ({n.era})" for n in isolated])
        pytest.fail(f"孤立ノードが{result}個存在します:\n{details}")

    assert result == 0, f"孤立ノードが{result}個存在します"


def test_no_self_loops(db_session):
    """
    自己ループ（src_id = dst_id）が存在しないことを確認

    自己ループはゲームの進行を妨げるため、禁止されている。
    """
    result = db_session.execute(
        text("SELECT COUNT(*) FROM relations WHERE src_id = dst_id")
    ).scalar()

    # 自己ループがある場合は詳細を表示
    if result > 0:
        self_loops = db_session.execute(
            text("""
                SELECT id, src_id, dst_id, relation_type
                FROM relations
                WHERE src_id = dst_id
            """)
        ).fetchall()
        details = "\n".join([f"  - Relation ID {r.id}: term_id={r.src_id}, type={r.relation_type}"
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


def test_era_distribution(db_session):
    """
    時代別の用語分布を確認

    各時代に最低10語以上あることを確認（バランスの取れたデータセット）
    """
    era_counts = db_session.execute(
        text("""
            SELECT era, COUNT(*) AS count
            FROM terms
            GROUP BY era
            ORDER BY
                CASE era
                    WHEN '古代' THEN 1
                    WHEN '中世' THEN 2
                    WHEN '近世' THEN 3
                    WHEN '近代' THEN 4
                    WHEN '現代' THEN 5
                    ELSE 6
                END
        """)
    ).fetchall()

    for era_count in era_counts:
        assert era_count.count >= 10, \
            f"{era_count.era}の用語数が{era_count.count}です（期待値: 10以上）"


def test_relation_type_diversity(db_session):
    """
    リレーションタイプの多様性を確認

    最低3種類以上のリレーションタイプが使われていることを確認
    """
    type_count = db_session.execute(
        text("SELECT COUNT(DISTINCT relation_type) FROM relations")
    ).scalar()

    assert type_count >= 3, \
        f"リレーションタイプが{type_count}種類です（期待値: 3種類以上）"


def test_duplicate_relations(db_session):
    """
    重複リレーションが存在しないことを確認

    同じsrc_id, dst_id, relation_typeの組み合わせは1つのみ許可
    （UNIQUE制約で保証されているはずだが、念のため確認）
    """
    duplicates = db_session.execute(
        text("""
            SELECT src_id, dst_id, relation_type, COUNT(*) AS dup_count
            FROM relations
            GROUP BY src_id, dst_id, relation_type
            HAVING COUNT(*) > 1
        """)
    ).fetchall()

    assert len(duplicates) == 0, \
        f"重複リレーションが{len(duplicates)}個存在します"


@pytest.mark.parametrize("era", ["古代", "中世", "近世", "近代", "現代"])
def test_era_connectivity(db_session, era):
    """
    各時代の用語が孤立していないことを確認

    各時代の用語が、他の時代の用語と少なくとも1つ以上繋がっていることを確認
    （時代を跨いだゲームプレイを可能にするため）
    """
    # 指定された時代の用語で、他の時代と繋がっているものの数
    connected_count = db_session.execute(
        text("""
            SELECT COUNT(DISTINCT t1.id)
            FROM terms t1
            JOIN relations r ON (r.src_id = t1.id OR r.dst_id = t1.id)
            JOIN terms t2 ON (
                (r.src_id = t2.id AND r.dst_id = t1.id) OR
                (r.dst_id = t2.id AND r.src_id = t1.id)
            )
            WHERE t1.era = :era AND t2.era != :era
        """),
        {"era": era}
    ).scalar()

    # 指定された時代の総用語数
    total_count = db_session.execute(
        text("SELECT COUNT(*) FROM terms WHERE era = :era"),
        {"era": era}
    ).scalar()

    # 少なくとも25%以上の用語が他の時代と繋がっていることを期待
    if total_count > 0:
        connectivity_ratio = connected_count / total_count
        assert connectivity_ratio >= 0.25, \
            f"{era}の用語のうち他の時代と繋がっているのは{connectivity_ratio:.1%}です（期待値: 25%以上）"


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
                ROUND(AVG(degree), 2) AS avg_degree
            FROM v_term_degrees
        """)
    ).fetchone()

    # 時代別用語数
    era_counts = db_session.execute(
        text("""
            SELECT era, COUNT(*) AS count
            FROM terms
            GROUP BY era
            ORDER BY
                CASE era
                    WHEN '古代' THEN 1
                    WHEN '中世' THEN 2
                    WHEN '近世' THEN 3
                    WHEN '近代' THEN 4
                    WHEN '現代' THEN 5
                    ELSE 6
                END
        """)
    ).fetchall()

    # リレーションタイプ別数
    relation_types = db_session.execute(
        text("""
            SELECT relation_type, COUNT(*) AS count
            FROM relations
            GROUP BY relation_type
            ORDER BY count DESC
            LIMIT 5
        """)
    ).fetchall()

    # サマリー出力
    print("\n" + "="*50)
    print("データ品質サマリー")
    print("="*50)
    print(f"用語数: {term_count}")
    print(f"リレーション数: {relation_count}")
    print(f"次数統計: 最小={degree_stats.min_degree}, 最大={degree_stats.max_degree}, 平均={degree_stats.avg_degree}")
    print("\n時代別用語数:")
    for era_count in era_counts:
        print(f"  {era_count.era}: {era_count.count}語")
    print("\nリレーションタイプ別数（上位5件）:")
    for rt in relation_types:
        print(f"  {rt.relation_type}: {rt.count}件")
    print("="*50)

    # このテストは常に成功
    assert True
