"""
ダミー生成ロジックのテスト（新仕様）

新難易度システム:
- easy: Tier1のみ
- normal: Tier1-2
- hard: 全Tier

全難易度共通: 正解とは直接繋がっていない（2hop以上離れている）
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy import text
from app.services.distractor_generator import (
    generate_distractors,
    get_neighbors_for_term,
    get_terms_by_tier,
)


class TestGetNeighbors:
    """隣接ノード取得のテスト"""

    def test_get_neighbors_basic(self, db_session):
        """隣接ノードを正しく取得できる"""
        neighbors = get_neighbors_for_term(1, db_session)

        assert isinstance(neighbors, set)
        # 何らかの隣接ノードがあるはず（リレーションがあるテストデータ前提）

    def test_get_neighbors_nonexistent(self, db_session):
        """存在しない用語IDの場合は空セット"""
        neighbors = get_neighbors_for_term(99999, db_session)
        assert neighbors == set()


class TestGetTermsByTier:
    """Tier別用語取得のテスト"""

    def test_get_tier1_terms(self, db_session):
        """Tier1の用語を取得"""
        terms = get_terms_by_tier(1, db_session)

        assert isinstance(terms, list)

        # 取得した全てがTier1であることを確認
        for term_id in terms:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": term_id}
            ).fetchone()
            assert result[0] == 1

    def test_get_tier1_2_terms(self, db_session):
        """Tier1-2の用語を取得"""
        terms = get_terms_by_tier(2, db_session)

        assert isinstance(terms, list)

        # 取得した全てがTier1-2であることを確認
        for term_id in terms:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": term_id}
            ).fetchone()
            assert result[0] <= 2

    def test_get_all_tiers(self, db_session):
        """全Tier（1-3）の用語を取得"""
        terms = get_terms_by_tier(3, db_session)

        assert isinstance(terms, list)

        # 取得した全てがTier1-3であることを確認
        for term_id in terms:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": term_id}
            ).fetchone()
            assert result[0] <= 3


class TestEasyDistractors:
    """Easy難易度ダミー生成のテスト"""

    def test_generate_easy_distractors(self, db_session):
        """Easy難易度のダミーを生成"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='easy',
            count=3,
            db=db_session
        )

        # 全て異なる
        assert len(distractors) == len(set(distractors))

        # 訪問済みでない
        for d in distractors:
            assert d not in visited

        # 正解と異なる
        for d in distractors:
            assert d != correct_id

    def test_easy_distractors_tier1_only(self, db_session):
        """Easy難易度のダミーはTier1のみ"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='easy',
            count=3,
            db=db_session
        )

        for d in distractors:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": d}
            ).fetchone()
            assert result[0] == 1

    def test_easy_distractors_not_directly_connected(self, db_session):
        """Easy難易度のダミーは正解と直接繋がっていない（2hop以上）"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='easy',
            count=3,
            db=db_session
        )

        correct_neighbors = get_neighbors_for_term(correct_id, db_session)

        for d in distractors:
            # 正解の隣接ノードではない（2hop以上離れている）
            assert d not in correct_neighbors


class TestNormalDistractors:
    """Normal難易度ダミー生成のテスト"""

    def test_generate_normal_distractors(self, db_session):
        """Normal難易度のダミーを生成"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='normal',
            count=3,
            db=db_session
        )

        # 全て異なる
        assert len(distractors) == len(set(distractors))

    def test_normal_distractors_tier1_2_only(self, db_session):
        """Normal難易度のダミーはTier1-2のみ"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='normal',
            count=3,
            db=db_session
        )

        for d in distractors:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": d}
            ).fetchone()
            assert result[0] <= 2

    def test_normal_distractors_not_directly_connected(self, db_session):
        """Normal難易度のダミーは正解と直接繋がっていない（2hop以上）"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='normal',
            count=3,
            db=db_session
        )

        correct_neighbors = get_neighbors_for_term(correct_id, db_session)

        for d in distractors:
            assert d not in correct_neighbors


class TestHardDistractors:
    """Hard難易度ダミー生成のテスト"""

    def test_generate_hard_distractors(self, db_session):
        """Hard難易度のダミーを生成"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            db=db_session
        )

        # 少なくとも1個は生成される
        assert len(distractors) >= 1

        # 全て異なる
        assert len(distractors) == len(set(distractors))

    def test_hard_distractors_all_tiers(self, db_session):
        """Hard難易度のダミーは全Tier"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            db=db_session
        )

        for d in distractors:
            result = db_session.execute(
                text("SELECT tier FROM terms WHERE id = :id"),
                {"id": d}
            ).fetchone()
            assert result[0] <= 3

    def test_hard_distractors_not_directly_connected(self, db_session):
        """Hard難易度のダミーは正解と直接繋がっていない（2hop以上）"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            db=db_session
        )

        correct_neighbors = get_neighbors_for_term(correct_id, db_session)

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
            count=count,
            db=db_session
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
        # ほぼ全てのノードを訪問済みにする
        result = db_session.execute(text("SELECT id FROM terms"))
        all_ids = [row[0] for row in result]

        # 最後の5個だけ残す
        visited = set(all_ids[:-5])

        correct_id = all_ids[-1]
        current_id = all_ids[-2]

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=10,  # 10個要求するが、候補は少ない
            db=db_session
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
            db=db_session,
            seed=42
        )

        result2 = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='hard',
            count=3,
            db=db_session,
            seed=42
        )

        # 同じ結果が得られる
        assert result1 == result2
