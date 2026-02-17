"""
Property-based testing using Hypothesis for real game logic.

generate_route() と generate_distractors() の出力特性を検証する。
これらはキャッシュ（DBデータ）に依存するため、DB未起動時はスキップされる。
"""
import pytest
from sqlalchemy import create_engine, text
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.services.route_generator import generate_route
from app.services.distractor_generator import generate_distractors
from app.services.cache import get_cache


# --------------------------------------------------------------------------- #
# DB availability check (conftest.py の requires_db と同等のローカル定義)
# --------------------------------------------------------------------------- #

def _is_db_available() -> bool:
    """DB接続チェック"""
    import os
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://histlink_user:histlink_dev_password@localhost:5432/histlink",
    )
    try:
        eng = create_engine(db_url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


_DB_AVAILABLE = _is_db_available()

requires_db = pytest.mark.skipif(
    not _DB_AVAILABLE,
    reason="Database not available",
)


# --------------------------------------------------------------------------- #
# generate_route() のプロパティテスト
# --------------------------------------------------------------------------- #

@requires_db
class TestGenerateRouteProperties:
    """generate_route() の出力特性をプロパティベースで検証する"""

    @given(
        target_length=st.integers(min_value=5, max_value=15),
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=10, deadline=10000)
    def test_route_has_no_duplicates(self, target_length, difficulty):
        """ルート内に term_id の重複がない"""
        route = generate_route(
            target_length=target_length + 1,
            difficulty=difficulty,
            max_start_retries=10,
            max_same_start_retries=20,
        )
        assume(len(route) >= 2)
        assert len(route) == len(set(route)), (
            f"Duplicate term IDs in route: {route}"
        )

    @given(
        target_length=st.integers(min_value=5, max_value=15),
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=10, deadline=10000)
    def test_route_length_within_requested(self, target_length, difficulty):
        """ルートの長さが要求ノード数以下（到達不能時は短くなる）"""
        requested = target_length + 1
        route = generate_route(
            target_length=requested,
            difficulty=difficulty,
            max_start_retries=10,
            max_same_start_retries=20,
        )
        assert len(route) <= requested, (
            f"Route length {len(route)} exceeds requested {requested}"
        )

    @given(
        target_length=st.integers(min_value=5, max_value=15),
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=10, deadline=10000)
    def test_consecutive_terms_have_edge(self, target_length, difficulty):
        """ルート内の連続する term_id 間にエッジが存在する"""
        cache = get_cache()
        route = generate_route(
            target_length=target_length + 1,
            difficulty=difficulty,
            max_start_retries=10,
            max_same_start_retries=20,
        )
        assume(len(route) >= 2)
        for i in range(len(route) - 1):
            edge = cache.get_edge(route[i], route[i + 1])
            assert edge is not None, (
                f"No edge between term {route[i]} and {route[i + 1]} at step {i}"
            )

    @given(
        target_length=st.integers(min_value=3, max_value=10),
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=10, deadline=10000)
    def test_route_terms_exist_in_cache(self, target_length, difficulty):
        """ルート内の全 term_id がキャッシュに存在する"""
        cache = get_cache()
        route = generate_route(
            target_length=target_length + 1,
            difficulty=difficulty,
            max_start_retries=10,
            max_same_start_retries=20,
        )
        assume(len(route) >= 1)
        for term_id in route:
            assert cache.get_term(term_id) is not None, (
                f"term_id {term_id} not found in cache"
            )


# --------------------------------------------------------------------------- #
# generate_distractors() のプロパティテスト
# --------------------------------------------------------------------------- #

@requires_db
class TestGenerateDistractorsProperties:
    """generate_distractors() の出力特性をプロパティベースで検証する"""

    def _get_test_ids(self):
        """テスト用に最低3件の term_id を返す"""
        cache = get_cache()
        all_ids = cache.get_terms_by_max_tier(3)
        assume(len(all_ids) >= 3)
        return all_ids

    @given(
        count=st.integers(min_value=1, max_value=5),
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=15, deadline=5000)
    def test_distractors_count_within_limit(self, count, difficulty):
        """返却数が要求数以下"""
        all_ids = self._get_test_ids()
        correct_id = all_ids[0]
        current_id = all_ids[1]
        visited = {current_id}

        result = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=count,
        )
        assert len(result) <= count, (
            f"Returned {len(result)} distractors but requested only {count}"
        )

    @given(
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=15, deadline=5000)
    def test_correct_not_in_distractors(self, difficulty):
        """正解 term_id が distractor に含まれない"""
        all_ids = self._get_test_ids()
        correct_id = all_ids[0]
        current_id = all_ids[1]
        visited = {current_id}

        result = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3,
        )
        assert correct_id not in result, (
            f"Correct ID {correct_id} found in distractors {result}"
        )

    @given(
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=15, deadline=5000)
    def test_visited_not_in_distractors(self, difficulty):
        """訪問済み term_id が distractor に含まれない"""
        all_ids = self._get_test_ids()
        assume(len(all_ids) >= 5)
        correct_id = all_ids[0]
        current_id = all_ids[1]
        visited = {current_id, all_ids[2], all_ids[3]}

        result = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3,
        )
        for d in result:
            assert d not in visited, (
                f"Visited term {d} found in distractors {result}"
            )

    @given(
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=15, deadline=5000)
    def test_distractors_no_duplicates(self, difficulty):
        """distractor リストに重複がない"""
        all_ids = self._get_test_ids()
        correct_id = all_ids[0]
        current_id = all_ids[1]
        visited = {current_id}

        result = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3,
        )
        assert len(result) == len(set(result)), (
            f"Duplicate IDs in distractors: {result}"
        )

    @given(
        difficulty=st.sampled_from(["easy", "normal", "hard"]),
    )
    @settings(max_examples=15, deadline=5000)
    def test_distractors_exist_in_cache(self, difficulty):
        """distractor の全 term_id がキャッシュに存在する"""
        cache = get_cache()
        all_ids = self._get_test_ids()
        correct_id = all_ids[0]
        current_id = all_ids[1]
        visited = {current_id}

        result = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3,
        )
        for d in result:
            assert cache.get_term(d) is not None, (
                f"distractor term_id {d} not found in cache"
            )
