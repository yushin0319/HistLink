"""
ダミー生成ロジックのテスト（キャッシュ版）

新難易度システム:
- easy: Tier1のみ
- normal: Tier1-2
- hard: 全Tier

全難易度共通: 正解とは直接繋がっていない（2hop以上離れている）
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from app.services.distractor_generator import generate_distractors
from app.services.cache import get_cache


class TestDistractorsByDifficulty:
    """難易度別ダミー生成のテスト（parametrize版）"""

    @pytest.mark.parametrize("difficulty,min_count", [
        ('easy', 0),
        ('normal', 0),
        ('hard', 1),
    ])
    def test_generate_distractors(self, difficulty, min_count, db_session):
        """ダミーは重複なし・訪問済みでない・正解と異なる"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3
        )

        if min_count > 0:
            assert len(distractors) >= min_count
        assert len(distractors) == len(set(distractors))
        for d in distractors:
            assert d not in visited
            assert d != correct_id

    @pytest.mark.parametrize("difficulty,max_tier", [
        ('easy', 1),
        ('normal', 2),
        ('hard', 3),
    ])
    def test_distractors_tier_constraint(self, difficulty, max_tier, db_session):
        """難易度に応じたTier制約を満たす"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3
        )

        cache = get_cache()
        for d in distractors:
            term = cache.get_term(d)
            assert term is not None
            assert term.tier <= max_tier

    @pytest.mark.parametrize("difficulty", ['easy', 'normal', 'hard'])
    def test_distractors_not_directly_connected(self, difficulty, db_session):
        """ダミーは正解と直接繋がっていない（2hop以上）"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=3
        )

        cache = get_cache()
        correct_neighbors = cache.get_neighbors(correct_id)

        for d in distractors:
            assert d not in correct_neighbors


class TestDistractorProperties:
    """ダミー生成のプロパティテスト"""

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        difficulty=st.sampled_from(['easy', 'normal', 'hard']),
        count=st.integers(min_value=1, max_value=5)
    )
    def test_distractor_generation_properties(self, difficulty, count, db_session):
        """ダミー生成が満たすべき不変条件"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty=difficulty,
            count=count
        )

        # Property 1: 要求された数以下
        assert len(distractors) <= count

        # Property 2: 重複なし
        assert len(distractors) == len(set(distractors))

        # Property 3: 訪問済みでない
        for d in distractors:
            assert d not in visited

        # Property 4: 正解と異なる
        for d in distractors:
            assert d != correct_id


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_insufficient_candidates(self, db_session):
        """候補が不足している場合"""
        cache = get_cache()
        all_ids = list(cache.terms.keys())

        # 最後の5個だけ残す
        visited = set(all_ids[:-5])

        correct_id = all_ids[-1]
        current_id = all_ids[-2]

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=10  # 10個要求するが、候補は少ない
        )

        # 取得可能な数だけ返す
        assert len(distractors) <= 10

    def test_generate_distractors_with_seed(self, db_session):
        """seedパラメータ指定で決定的な結果を得る"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        # 同じseedで複数回実行
        result1 = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            seed=42
        )

        result2 = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            seed=42
        )

        # 同じ結果が得られる
        assert result1 == result2
