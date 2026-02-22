"""
ゲームライフサイクル統合テスト

個別エンドポイントのテスト（test_games_api.py）とは異なり、
ゲーム全体のフロー（start → result → ranking → update）を横断的に検証する。
"""
import pytest
from sqlalchemy import text


class TestFullGameLifecycle:
    """ゲーム開始→結果送信→ランキング→名前変更の一連のフロー"""

    def test_start_result_ranking_update(self, client, db_session):
        """ゲーム開始→結果送信→ランキング確認→名前変更→ランキング再確認"""
        # Step 1: ゲーム開始
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 10}
        )
        assert start_res.status_code == 200
        game_id = start_res.json()["game_id"]
        steps = start_res.json()["steps"]
        assert len(steps) == 11  # 10問 + 最終ノード

        # Step 2: 結果送信（8問クリア、ライフ2残り）
        # base_score = 800（各問100点）、max_base_score = 8 * 200 = 1600
        result_res = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 800,
                "final_lives": 2,
                "cleared_steps": 8,
                "user_name": "GUEST"
            }
        )
        assert result_res.status_code == 200
        result_data = result_res.json()
        # final_score = 800 + 2 * 200 = 1200（normal の LIFE_BONUS=200）
        assert result_data["final_score"] == 1200
        assert result_data["my_rank"] >= 1

        # Step 3: 全体ランキングにこのゲームが含まれることを確認
        ranking_res = client.get(
            "/api/v1/games/rankings/overall",
            params={"my_score": 1200}
        )
        assert ranking_res.status_code == 200
        ranking_data = ranking_res.json()
        ranking_names = [r["user_name"] for r in ranking_data["rankings"]]
        assert "GUEST" in ranking_names

        # Step 4: 名前変更
        update_res = client.patch(
            f"/api/v1/games/{game_id}",
            json={"user_name": "LifecyclePlayer"}
        )
        assert update_res.status_code == 200
        assert update_res.json()["user_name"] == "LifecyclePlayer"
        # スコアは変更されない
        assert update_res.json()["final_score"] == 1200

        # Step 5: ランキングに変更後の名前が反映
        ranking_res2 = client.get(
            "/api/v1/games/rankings/overall",
            params={"my_score": 1200}
        )
        ranking_names2 = [r["user_name"] for r in ranking_res2.json()["rankings"]]
        assert "LifecyclePlayer" in ranking_names2
        assert "GUEST" not in ranking_names2  # 旧名は消えている

    def test_multiple_games_ranking_separation_by_steps(self, client, db_session):
        """問題数が異なるゲームはランキングが分離される"""
        # ゲーム1: 10問
        start1 = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 10}
        )
        game_id1 = start1.json()["game_id"]
        result1 = client.post(
            f"/api/v1/games/{game_id1}/result",
            json={"base_score": 500, "final_lives": 3, "cleared_steps": 10, "user_name": "Player10"}
        )
        assert result1.status_code == 200
        # 10問ランキングにPlayer10が含まれる
        rankings_10 = result1.json()["rankings"]
        names_10 = [r["user_name"] for r in rankings_10]
        assert "Player10" in names_10

        # ゲーム2: 5問
        start2 = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id2 = start2.json()["game_id"]
        result2 = client.post(
            f"/api/v1/games/{game_id2}/result",
            json={"base_score": 300, "final_lives": 3, "cleared_steps": 5, "user_name": "Player5"}
        )
        assert result2.status_code == 200
        # 5問ランキングにはPlayer5のみ、Player10は含まれない
        rankings_5 = result2.json()["rankings"]
        names_5 = [r["user_name"] for r in rankings_5]
        assert "Player5" in names_5
        assert "Player10" not in names_5


class TestLifeBonusCalculation:
    """難易度別ライフボーナスの正確性"""

    @pytest.mark.parametrize("difficulty,bonus_per_life", [
        ("easy", 100),
        ("normal", 200),
        ("hard", 300),
    ])
    def test_life_bonus_by_difficulty(self, client, db_session, difficulty, bonus_per_life):
        """各難易度でライフボーナスが正しく計算される"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": difficulty, "target_length": 5}
        )
        game_id = start_res.json()["game_id"]

        base_score = 100
        lives = 2
        result_res = client.post(
            f"/api/v1/games/{game_id}/result",
            json={"base_score": base_score, "final_lives": lives, "cleared_steps": 5}
        )
        assert result_res.status_code == 200
        expected = base_score + lives * bonus_per_life
        assert result_res.json()["final_score"] == expected


class TestServerSideValidation:
    """サーバー側バリデーションの統合テスト"""

    def test_cleared_steps_exceeds_total(self, client, db_session):
        """cleared_stepsがtotal_stepsを超える場合は400"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id = start_res.json()["game_id"]

        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={"base_score": 0, "final_lives": 0, "cleared_steps": 6}  # 5問なのに6
        )
        assert response.status_code == 400

    def test_base_score_exceeds_max(self, client, db_session):
        """base_scoreがmax_base_score(cleared_steps * 200)を超える場合は400"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id = start_res.json()["game_id"]

        # cleared_steps=3 → max_base_score=600 なのに 700 を送信
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={"base_score": 700, "final_lives": 3, "cleared_steps": 3}
        )
        assert response.status_code == 400

    def test_invalid_lives_value(self, client, db_session):
        """final_livesが範囲外（0-3）の場合は400"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id = start_res.json()["game_id"]

        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={"base_score": 0, "final_lives": 4, "cleared_steps": 5}
        )
        assert response.status_code == 400


class TestRouteConsistency:
    """キャッシュ経由のルート生成一貫性"""

    def test_all_steps_have_complete_data(self, client, db_session):
        """全ステップにterm情報、choices、エッジ情報が揃っている"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        assert start_res.status_code == 200
        steps = start_res.json()["steps"]

        for i, step in enumerate(steps):
            # 全ステップにterm情報がある
            term = step["term"]
            assert term["id"] is not None
            assert term["name"] != ""
            assert term["tier"] in [1, 2, 3]
            assert term["category"] != ""

            if i < len(steps) - 1:
                # 中間ステップ: 4択 + エッジ情報
                assert len(step["choices"]) == 4
                assert step["correct_next_id"] is not None
                # 正解がchoicesに含まれる
                choice_ids = [c["term_id"] for c in step["choices"]]
                assert step["correct_next_id"] in choice_ids
            else:
                # 最終ステップ: 選択肢なし
                assert len(step["choices"]) == 0
                assert step["correct_next_id"] is None

    def test_route_has_no_duplicate_terms(self, client, db_session):
        """ルート内にterm重複がない"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        steps = start_res.json()["steps"]
        term_ids = [s["term"]["id"] for s in steps]
        assert len(term_ids) == len(set(term_ids)), "ルート内にterm重複が存在"

    def test_consecutive_steps_are_connected(self, client, db_session):
        """連続するステップのtermがcorrect_next_idで繋がっている"""
        start_res = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )
        steps = start_res.json()["steps"]

        for i in range(len(steps) - 1):
            current_step = steps[i]
            next_step = steps[i + 1]
            assert current_step["correct_next_id"] == next_step["term"]["id"], \
                f"Step {i}: correct_next_id={current_step['correct_next_id']} != next term id={next_step['term']['id']}"
