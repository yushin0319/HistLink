"""
ルート生成アルゴリズムのテスト（キャッシュ版）

難易度システム:
- easy: Tier1のみ + easyエッジのみ
- normal: Tier1-2 + easy/normalエッジ
- hard: 全Tier + 全エッジ

ランダムウォーク方式：
- 行き止まり回避付きランダムウォーク
- キャッシュからデータ取得
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from app.services.route_generator import (
    generate_route,
    _random_walk,
    _try_from_start,
    count_unvisited_neighbors,
    select_random_start,
    get_difficulty_filter,
)
from app.services.cache import get_cache


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
        """基本的なルート生成（メインエントリポイント）"""
        route = generate_route(
            target_length=10,
            difficulty='hard'
        )

        # ルートが生成されている
        assert len(route) > 0

        # 重複なし（全て異なるノード）
        assert len(route) == len(set(route))

    def test_random_walk_basic(self, db_session):
        """_random_walk: 指定スタートからのルート生成"""
        route = _random_walk(
            start_term_id=1,
            target_length=10,
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
        cache = get_cache()

        route = generate_route(
            target_length=5,
            difficulty='easy'
        )

        # ルートが生成されている
        assert len(route) > 0

        # 全ノードがTier1か確認
        for term_id in route:
            term = cache.get_term(term_id)
            assert term is not None
            assert term.tier == 1

    def test_route_follows_edges(self, db_session):
        """生成されたルートは実際のエッジに従っている"""
        cache = get_cache()
        route = generate_route(
            target_length=10,
            difficulty='hard'
        )

        # 各ステップが実際に繋がっているか確認
        for i in range(len(route) - 1):
            edge = cache.get_edge(route[i], route[i + 1])
            assert edge is not None, f"No edge between {route[i]} and {route[i + 1]}"


class TestScoringFunction:
    """スコアリング関数のテスト"""

    def test_count_unvisited_neighbors(self, db_session):
        """未訪問近傍数のカウント"""
        visited = {1, 2, 3}

        # term 4 の未訪問近傍数を計算
        count = count_unvisited_neighbors(4, visited)

        # 少なくとも0以上
        assert count >= 0


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_single_node_route(self, db_session):
        """長さ1のルート（スタートのみ）"""
        route = _random_walk(1, 1, difficulty='hard')
        assert route == [1]

    def test_generate_route_with_seed(self, db_session):
        """seedパラメータで決定的なルート生成"""
        route1 = generate_route(target_length=10, difficulty='hard', seed=42)
        route2 = generate_route(target_length=10, difficulty='hard', seed=42)

        # 同じseedなら同じルートが生成される
        assert route1 == route2


class TestRandomStart:
    """ランダムスタート地点のテスト"""

    def test_select_random_start_basic(self, db_session):
        """ランダムスタート地点を選択"""
        start_id = select_random_start(difficulty='hard')

        assert isinstance(start_id, int)
        assert start_id >= 1

    def test_select_random_start_easy(self, db_session):
        """Easy難易度でランダムスタート地点を選択（Tier1のみ）"""
        cache = get_cache()
        start_id = select_random_start(difficulty='easy')

        # 選ばれた用語がTier1か確認
        term = cache.get_term(start_id)
        assert term is not None
        assert term.tier == 1

    def test_select_random_start_normal(self, db_session):
        """Normal難易度でランダムスタート地点を選択（Tier1-2）"""
        cache = get_cache()
        start_id = select_random_start(difficulty='normal')

        # 選ばれた用語がTier1-2か確認
        term = cache.get_term(start_id)
        assert term is not None
        assert term.tier <= 2

    def test_select_random_start_deterministic(self, db_session):
        """seedで決定的になる"""
        start1 = select_random_start(difficulty='hard', seed=42)
        start2 = select_random_start(difficulty='hard', seed=42)
        assert start1 == start2


class TestMultipleStarts:
    """複数スタート地点でのルート生成テスト"""

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        max_examples=20
    )
    @given(start_id=st.integers(min_value=1, max_value=200))
    def test_try_from_start_any_start(self, start_id, db_session):
        """任意のスタート地点からルート生成（_try_from_start）"""
        cache = get_cache()

        # スタート地点が存在するか確認
        term = cache.get_term(start_id)

        if term is None:
            # 存在しないIDはスキップ
            return

        route = _try_from_start(
            start_term_id=start_id,
            target_length=10,
            difficulty='hard'
        )

        # 基本的な性質を検証
        assert len(route) > 0
        assert route[0] == start_id
        assert len(route) == len(set(route))  # 重複なし
