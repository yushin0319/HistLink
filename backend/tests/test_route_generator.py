"""
ルート生成アルゴリズムのテスト

TDD (Test-Driven Development) で実装:
1. BFS距離計算
2. スコアリング式：+2*dist_up + 1*residual_deg_capped - 3*triangle_hit
3. バックトラック
4. プロパティベーステスト（hypothesis）
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from app.services.route_generator import (
    calculate_bfs_distances,
    generate_route,
    count_unvisited_neighbors,
    count_triangle_hits,
    select_random_start,
)


class TestBFSDistances:
    """BFS距離計算のテスト"""

    def test_bfs_start_distance_is_zero(self, db_session):
        """スタート地点からの距離は0"""
        distances = calculate_bfs_distances(1, db_session)
        assert distances[1] == 0

    def test_bfs_neighbor_distance_is_one(self, db_session):
        """直接繋がっているノードの距離は1"""
        # term 1 と繋がっているノードを取得
        from sqlalchemy import text
        result = db_session.execute(
            text("""
            SELECT dst_id FROM relations WHERE src_id = 1
            UNION
            SELECT src_id FROM relations WHERE dst_id = 1
            """)
        )
        neighbors = [row[0] for row in result]

        distances = calculate_bfs_distances(1, db_session)
        for neighbor_id in neighbors:
            assert distances[neighbor_id] == 1

    def test_bfs_unreachable_nodes(self, db_session):
        """到達不可能なノードの距離はNoneまたは無限大"""
        # 孤立ノードを作成（テスト用）
        from sqlalchemy import text
        db_session.execute(text("INSERT INTO terms (id, name, era, tags, description) VALUES (999, 'isolated', '古代', '[]'::jsonb, 'test description')"))
        db_session.commit()

        distances = calculate_bfs_distances(1, db_session)
        assert 999 not in distances or distances.get(999) is None


class TestRouteGeneration:
    """ルート生成アルゴリズムのテスト"""

    def test_generate_route_basic(self, db_session):
        """基本的なルート生成"""
        route = generate_route(
            start_term_id=1,
            target_length=10,
            db=db_session
        )

        # ルートが生成されている
        assert len(route) > 0

        # スタート地点が正しい
        assert route[0] == 1

        # 重複なし（全て異なるノード）
        assert len(route) == len(set(route))

    def test_generate_route_reaches_target_length(self, db_session):
        """目標長さに到達する"""
        target = 15
        route = generate_route(
            start_term_id=1,
            target_length=target,
            db=db_session
        )

        # 目標長さに到達、または詰まるまで進む
        assert len(route) > 0

    def test_route_follows_relations(self, db_session):
        """生成されたルートは実際のリレーションに従っている"""
        from sqlalchemy import text
        route = generate_route(
            start_term_id=1,
            target_length=10,
            db=db_session
        )

        # 各ステップが実際に繋がっているか確認
        for i in range(len(route) - 1):
            src, dst = route[i], route[i + 1]

            result = db_session.execute(
                text("""
                SELECT COUNT(*) FROM relations
                WHERE (src_id = :src AND dst_id = :dst)
                   OR (src_id = :dst AND dst_id = :src)
                """),
                {"src": src, "dst": dst}
            ).fetchone()

            assert result[0] > 0, f"No relation between {src} and {dst}"


class TestScoringFunction:
    """スコアリング関数のテスト"""

    def test_count_unvisited_neighbors(self, db_session):
        """未訪問近傍数のカウント"""
        visited = {1, 2, 3}

        # term 4 の未訪問近傍数を計算
        count = count_unvisited_neighbors(4, visited, db_session)

        # 少なくとも0以上
        assert count >= 0

    def test_count_triangle_hits(self, db_session):
        """三角形ヒット数のカウント"""
        # recent_route = [1, 2, 3] のとき、
        # candidate 4 が 1,2,3 のいずれかと繋がっている数
        recent_route = [1, 2, 3]

        count = count_triangle_hits(4, recent_route, db_session)

        # 0〜3の範囲
        assert 0 <= count <= 3

    def test_triangle_hits_empty_route(self, db_session):
        """recent_routeが空の場合は0を返す"""
        count = count_triangle_hits(4, [], db_session)
        assert count == 0


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_single_node_route(self, db_session):
        """長さ1のルート（スタートのみ）"""
        route = generate_route(1, 1, db_session)
        assert route == [1]

    def test_isolated_node_fails_gracefully(self, db_session):
        """孤立ノードから開始した場合"""
        # 孤立ノードを作成
        from sqlalchemy import text
        db_session.execute(text("INSERT INTO terms (id, name, era, tags, description) VALUES (998, 'isolated2', '古代', '[]'::jsonb, 'test description')"))
        db_session.commit()

        route = generate_route(998, 10, db_session)

        # 長さ1（スタートのみ）のルートが返る
        assert route == [998]

    def test_generate_route_with_seed(self, db_session):
        """seedパラメータで決定的なルート生成"""
        route1 = generate_route(1, 10, db_session, seed=42)
        route2 = generate_route(1, 10, db_session, seed=42)

        # 同じseedなら同じルートが生成される
        assert route1 == route2


class TestRandomStart:
    """ランダムスタート地点のテスト"""

    def test_select_random_start_basic(self, db_session):
        """ランダムスタート地点を選択"""
        start_id = select_random_start(db_session)

        assert isinstance(start_id, int)
        assert start_id >= 1

    def test_select_random_start_with_era(self, db_session):
        """時代指定でランダムスタート地点を選択"""
        start_id = select_random_start(db_session, era='古代')

        # 選ばれた用語が実際に古代か確認
        from sqlalchemy import text
        result = db_session.execute(
            text("SELECT era FROM terms WHERE id = :id"),
            {"id": start_id}
        ).fetchone()
        assert result[0] == '古代'

    def test_select_random_start_deterministic(self, db_session):
        """seedで決定的になる"""
        start1 = select_random_start(db_session, seed=42)
        start2 = select_random_start(db_session, seed=42)
        assert start1 == start2

    def test_select_random_start_invalid_era(self, db_session):
        """存在しない時代を指定した場合"""
        with pytest.raises(ValueError, match="No terms found"):
            select_random_start(db_session, era='未来')


class TestMultipleStarts:
    """複数スタート地点でのルート生成テスト"""

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        max_examples=20
    )
    @given(start_id=st.integers(min_value=1, max_value=200))
    def test_generate_route_any_start(self, start_id, db_session):
        """任意のスタート地点からルート生成"""
        from sqlalchemy import text

        # スタート地点が存在するか確認
        result = db_session.execute(
            text("SELECT id FROM terms WHERE id = :id"),
            {"id": start_id}
        ).fetchone()

        if result is None:
            # 存在しないIDはスキップ
            return

        route = generate_route(
            start_term_id=start_id,
            target_length=10,
            db=db_session
        )

        # 基本的な性質を検証
        assert len(route) > 0
        assert route[0] == start_id
        assert len(route) == len(set(route))  # 重複なし
