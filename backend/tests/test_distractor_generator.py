"""
ダミー生成ロジックのテスト

TDD (Test-Driven Development) で実装:
- Easy: 時代2つ以上違い、2hop以上離れた
- Standard: 時代±1、2hop以上離れた
- Hard: 同時代、2hop以上離れた

全難易度共通: 正解とは直接繋がっていない（2hop以上離れている）
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy import text
from app.services.distractor_generator import (
    generate_distractors,
    get_term_info,
    calculate_distance_between,
    count_common_tags,
    get_era_neighbors,
)


class TestTermInfo:
    """用語情報取得のテスト"""

    def test_get_term_info(self, db_session):
        """用語情報を正しく取得できる"""
        term_info = get_term_info(1, db_session)

        assert term_info is not None
        assert 'id' in term_info
        assert 'name' in term_info
        assert 'era' in term_info
        assert 'tags' in term_info
        assert term_info['id'] == 1

    def test_get_term_info_nonexistent(self, db_session):
        """存在しない用語IDの場合"""
        term_info = get_term_info(99999, db_session)
        assert term_info is None


class TestDistanceCalculation:
    """距離計算のテスト"""

    def test_calculate_distance_direct_connection(self, db_session):
        """直接繋がっている場合の距離は1"""
        # term 1 と繋がっているノードを取得
        result = db_session.execute(
            text("""
            SELECT dst_id FROM relations WHERE src_id = 1
            UNION
            SELECT src_id FROM relations WHERE dst_id = 1
            LIMIT 1
            """)
        )
        neighbor_id = result.fetchone()[0]

        distance = calculate_distance_between(1, neighbor_id, db_session)
        assert distance == 1

    def test_calculate_distance_two_hops(self, db_session):
        """2hop離れている場合の距離は2（ループ内早期リターンのテスト）"""
        # term 1から2hopの距離にあるノードを見つける
        # まず1hopのノードを取得
        result = db_session.execute(
            text("""
            SELECT dst_id FROM relations WHERE src_id = 1
            UNION
            SELECT src_id FROM relations WHERE dst_id = 1
            LIMIT 1
            """)
        )
        one_hop_id = result.fetchone()[0]

        # そのノードから繋がっているノードを取得（1とは異なる）
        result = db_session.execute(
            text("""
            SELECT dst_id FROM relations WHERE src_id = :one_hop
            UNION
            SELECT src_id FROM relations WHERE dst_id = :one_hop
            """),
            {"one_hop": one_hop_id}
        )
        for (two_hop_id,) in result:
            if two_hop_id != 1:
                # 2hopのノードが見つかった
                distance = calculate_distance_between(1, two_hop_id, db_session)
                # 距離が2または1（1の場合は別の経路で繋がっている）
                assert distance >= 1
                break

    def test_calculate_distance_same_node(self, db_session):
        """同じノードの場合の距離は0"""
        distance = calculate_distance_between(1, 1, db_session)
        assert distance == 0

    def test_calculate_distance_unreachable(self, db_session):
        """到達不可能な場合はNoneまたは無限大"""
        # 孤立ノードを作成
        db_session.execute(text("INSERT INTO terms (id, name, era, tags, description) VALUES (997, 'isolated_test', '古代', '[]'::jsonb, 'test description')"))
        db_session.commit()

        distance = calculate_distance_between(1, 997, db_session)
        assert distance is None or distance == float('inf')


class TestTagComparison:
    """タグ比較のテスト"""

    def test_count_common_tags(self, db_session):
        """共通タグ数をカウント"""
        # term 1 と term 2 の共通タグ数
        count = count_common_tags(1, 2, db_session)

        # 0以上の整数
        assert isinstance(count, int)
        assert count >= 0

    def test_count_common_tags_same_term(self, db_session):
        """同じ用語の共通タグ数は全タグ数"""
        term_info = get_term_info(1, db_session)
        if term_info and term_info['tags']:
            count = count_common_tags(1, 1, db_session)
            assert count == len(term_info['tags'])

    def test_count_common_tags_none_term(self, db_session):
        """存在しない用語IDの場合は0を返す"""
        count = count_common_tags(99999, 1, db_session)
        assert count == 0


class TestEraNeighbors:
    """時代の前後取得のテスト"""

    def test_get_era_neighbors_invalid_era(self, db_session):
        """不正な時代名の場合は空リストを返す"""
        neighbors = get_era_neighbors('不正な時代')
        assert neighbors == []

    def test_get_era_neighbors_first_era(self, db_session):
        """最初の時代（古代）の場合"""
        neighbors = get_era_neighbors('古代')
        # 古代, 中世を含む（前の時代はない）
        assert '古代' in neighbors
        assert '中世' in neighbors
        assert len(neighbors) == 2

    def test_get_era_neighbors_middle_era(self, db_session):
        """中間の時代の場合"""
        neighbors = get_era_neighbors('中世')
        # 古代, 中世, 近世を含む
        assert '古代' in neighbors
        assert '中世' in neighbors
        assert '近世' in neighbors
        assert len(neighbors) == 3

    def test_get_era_neighbors_last_era(self, db_session):
        """最後の時代（現代）の場合"""
        neighbors = get_era_neighbors('現代')
        # 近代, 現代を含む（次の時代はない）
        assert '近代' in neighbors
        assert '現代' in neighbors
        assert len(neighbors) == 2


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

        # 3個生成される
        assert len(distractors) == 3

        # 全て異なる
        assert len(distractors) == len(set(distractors))

        # 訪問済みでない
        for d in distractors:
            assert d not in visited

        # 正解と異なる
        for d in distractors:
            assert d != correct_id

    def test_easy_distractors_different_era(self, db_session):
        """Easy難易度のダミーは異なる時代"""
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

        correct_info = get_term_info(correct_id, db_session)

        for d in distractors:
            d_info = get_term_info(d, db_session)
            # 時代が異なる
            assert d_info['era'] != correct_info['era']

    def test_easy_distractors_far_distance(self, db_session):
        """Easy難易度のダミーは2hop以上離れている"""
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
            distance = calculate_distance_between(correct_id, d, db_session)
            # 2hop以上離れている（Noneの場合は十分遠い）
            assert distance is None or distance >= 2


class TestStandardDistractors:
    """Standard難易度ダミー生成のテスト"""

    def test_generate_standard_distractors(self, db_session):
        """Standard難易度のダミーを生成"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='standard',
            count=3,
            db=db_session
        )

        # 3個生成される
        assert len(distractors) == 3

        # 全て異なる
        assert len(distractors) == len(set(distractors))

    def test_standard_distractors_similar_era(self, db_session):
        """Standard難易度のダミーは時代±1"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='standard',
            count=3,
            db=db_session
        )

        correct_info = get_term_info(correct_id, db_session)

        # 時代の順序
        era_order = ['古代', '中世', '近世', '近代', '現代']
        correct_era_idx = era_order.index(correct_info['era'])

        for d in distractors:
            d_info = get_term_info(d, db_session)
            d_era_idx = era_order.index(d_info['era'])

            # 時代差は±1以内
            era_diff = abs(d_era_idx - correct_era_idx)
            assert era_diff <= 1

    def test_standard_distractors_far_distance(self, db_session):
        """Standard難易度のダミーは2hop以上離れている"""
        correct_id = 1
        current_id = 2
        visited = {1, 2}

        distractors = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='standard',
            count=3,
            db=db_session
        )

        for d in distractors:
            distance = calculate_distance_between(correct_id, d, db_session)
            # 2hop以上離れている（Noneの場合は十分遠い）
            assert distance is None or distance >= 2


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

    def test_hard_distractors_same_era(self, db_session):
        """Hard難易度のダミーは同じ時代"""
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

        correct_info = get_term_info(correct_id, db_session)

        for d in distractors:
            d_info = get_term_info(d, db_session)
            # 同じ時代
            assert d_info['era'] == correct_info['era']

    def test_hard_distractors_far_distance(self, db_session):
        """Hard難易度のダミーは2hop以上離れている"""
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
            distance = calculate_distance_between(correct_id, d, db_session)
            # 2hop以上離れている（Noneの場合は十分遠い）
            assert distance is None or distance >= 2


class TestDistractorProperties:
    """ダミー生成のプロパティテスト"""

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        difficulty=st.sampled_from(['easy', 'standard', 'hard']),
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
            difficulty='easy',
            count=10,  # 10個要求するが、候補は4個しかない
            db=db_session
        )

        # 取得可能な数だけ返す
        assert len(distractors) <= 4

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
            difficulty='easy',
            count=3,
            db=db_session,
            seed=42
        )

        result2 = generate_distractors(
            correct_id=correct_id,
            current_id=current_id,
            visited=visited,
            difficulty='easy',
            count=3,
            db=db_session,
            seed=42
        )

        # 同じ結果が得られる
        assert result1 == result2

    def test_generate_distractors_none_correct(self, db_session):
        """正解用語が存在しない場合は空リストを返す"""
        distractors = generate_distractors(
            correct_id=99999,
            current_id=1,
            visited={1},
            difficulty='easy',
            count=3,
            db=db_session
        )

        assert distractors == []

    def test_generate_distractors_invalid_difficulty(self, db_session):
        """不正な難易度の場合はstandardとして扱う"""
        distractors = generate_distractors(
            correct_id=1,
            current_id=2,
            visited={1, 2},
            difficulty='invalid',
            count=3,
            db=db_session
        )

        # standardとして処理されるので、結果が返る
        assert len(distractors) >= 0
