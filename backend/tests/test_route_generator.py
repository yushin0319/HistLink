"""
ルート生成アルゴリズムのテスト（ランダムウォーク版）

難易度システム:
- easy: Tier1のみ + easyエッジのみ
- normal: Tier1-2 + easy/normalエッジ
- hard: 全Tier + 全エッジ

ランダムウォーク方式：
- 行き止まり回避付きランダムウォーク
- BFSより高速で同等の品質
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from app.services.route_generator import (
    generate_route,
    count_unvisited_neighbors,
    select_random_start,
    get_difficulty_filter,
)


class TestDifficultyFilter:
    """難易度フィルタのテスト"""

    def test_easy_filter(self):
        """Easy難易度のフィルタ"""
        max_tier, allowed = get_difficulty_filter('easy')
        assert max_tier == 1
        assert allowed == ['easy']

    def test_normal_filter(self):
        """Normal難易度のフィルタ"""
        max_tier, allowed = get_difficulty_filter('normal')
        assert max_tier == 2
        assert allowed == ['easy', 'normal']

    def test_hard_filter(self):
        """Hard難易度のフィルタ"""
        max_tier, allowed = get_difficulty_filter('hard')
        assert max_tier == 3
        assert allowed == ['easy', 'normal', 'hard']


class TestRouteGeneration:
    """ルート生成アルゴリズムのテスト"""

    def test_generate_route_basic(self, db_session):
        """基本的なルート生成"""
        route = generate_route(
            start_term_id=1,
            target_length=10,
            db=db_session,
            difficulty='hard'
        )

        # ルートが生成されている
        assert len(route) > 0

        # スタート地点が正しい
        assert route[0] == 1

        # 重複なし（全て異なるノード）
        assert len(route) == len(set(route))

    def test_generate_route_easy_difficulty(self, db_session):
        """Easy難易度でのルート生成"""
        from sqlalchemy import text

        # Tier1の用語を取得
        result = db_session.execute(text("SELECT id FROM terms WHERE tier = 1 LIMIT 1"))
        tier1_id = result.fetchone()

        if tier1_id:
            route = generate_route(
                start_term_id=tier1_id[0],
                target_length=5,
                db=db_session,
                difficulty='easy'
            )

            # ルートが生成されている
            assert len(route) > 0
            assert route[0] == tier1_id[0]

    def test_route_follows_edges(self, db_session):
        """生成されたルートは実際のエッジに従っている"""
        from sqlalchemy import text
        route = generate_route(
            start_term_id=1,
            target_length=10,
            db=db_session,
            difficulty='hard'
        )

        # 各ステップが実際に繋がっているか確認
        for i in range(len(route) - 1):
            term_a, term_b = min(route[i], route[i + 1]), max(route[i], route[i + 1])

            result = db_session.execute(
                text("""
                SELECT COUNT(*) FROM edges
                WHERE term_a = :term_a AND term_b = :term_b
                """),
                {"term_a": term_a, "term_b": term_b}
            ).fetchone()

            assert result[0] > 0, f"No edge between {term_a} and {term_b}"


class TestScoringFunction:
    """スコアリング関数のテスト"""

    def test_count_unvisited_neighbors(self, db_session):
        """未訪問近傍数のカウント"""
        visited = {1, 2, 3}

        # term 4 の未訪問近傍数を計算
        count = count_unvisited_neighbors(4, visited, db_session)

        # 少なくとも0以上
        assert count >= 0


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_single_node_route(self, db_session):
        """長さ1のルート（スタートのみ）"""
        route = generate_route(1, 1, db_session, difficulty='hard')
        assert route == [1]

    def test_isolated_node_fails_gracefully(self, db_session):
        """孤立ノードから開始した場合"""
        from sqlalchemy import text
        db_session.execute(text(
            "INSERT INTO terms (id, name, tier, category, description) "
            "VALUES (998, 'isolated2', 1, 'テスト', 'test description')"
        ))
        db_session.commit()

        route = generate_route(998, 10, db_session, difficulty='hard')

        # 長さ1（スタートのみ）のルートが返る
        assert route == [998]

    def test_generate_route_with_seed(self, db_session):
        """seedパラメータで決定的なルート生成"""
        route1 = generate_route(1, 10, db_session, difficulty='hard', seed=42)
        route2 = generate_route(1, 10, db_session, difficulty='hard', seed=42)

        # 同じseedなら同じルートが生成される
        assert route1 == route2


class TestRandomStart:
    """ランダムスタート地点のテスト"""

    def test_select_random_start_basic(self, db_session):
        """ランダムスタート地点を選択"""
        start_id = select_random_start(db_session, difficulty='hard')

        assert isinstance(start_id, int)
        assert start_id >= 1

    def test_select_random_start_easy(self, db_session):
        """Easy難易度でランダムスタート地点を選択（Tier1のみ）"""
        from sqlalchemy import text
        start_id = select_random_start(db_session, difficulty='easy')

        # 選ばれた用語がTier1か確認
        result = db_session.execute(
            text("SELECT tier FROM terms WHERE id = :id"),
            {"id": start_id}
        ).fetchone()
        assert result[0] == 1

    def test_select_random_start_normal(self, db_session):
        """Normal難易度でランダムスタート地点を選択（Tier1-2）"""
        from sqlalchemy import text
        start_id = select_random_start(db_session, difficulty='normal')

        # 選ばれた用語がTier1-2か確認
        result = db_session.execute(
            text("SELECT tier FROM terms WHERE id = :id"),
            {"id": start_id}
        ).fetchone()
        assert result[0] <= 2

    def test_select_random_start_deterministic(self, db_session):
        """seedで決定的になる"""
        start1 = select_random_start(db_session, difficulty='hard', seed=42)
        start2 = select_random_start(db_session, difficulty='hard', seed=42)
        assert start1 == start2


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
            db=db_session,
            difficulty='hard'
        )

        # 基本的な性質を検証
        assert len(route) > 0
        assert route[0] == start_id
        assert len(route) == len(set(route))  # 重複なし


class TestErrorCases:
    """エラーケースのテスト"""

    def test_select_random_start_no_terms(self, db_session):
        """該当するtermがない場合はValueError"""
        from sqlalchemy import text

        # 全termsを削除（トランザクション内なのでロールバックされる）
        db_session.execute(text("DELETE FROM edges"))
        db_session.execute(text("DELETE FROM terms"))
        db_session.commit()

        with pytest.raises(ValueError, match="No terms found"):
            select_random_start(db_session, difficulty='easy')
