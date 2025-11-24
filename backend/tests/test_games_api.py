"""
ゲームAPI (POST /games/start, POST /games/{game_id}/result) のテスト
"""
import pytest
from uuid import UUID


class TestGameStart:
    """POST /games/start エンドポイントのテスト（全ルート+全選択肢）"""

    def test_game_start_full_basic(self, client, db_session):
        """全ルート+全選択肢を含むゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "standard", "target_length": 10}
        )

        assert response.status_code == 200
        data = response.json()

        # 基本フィールドを確認
        assert "game_id" in data
        UUID(data["game_id"])
        assert "route_id" in data
        assert data["difficulty"] == "standard"
        assert data["total_steps"] == 10
        assert "created_at" in data

        # stepsが存在し、全ステップ分ある
        assert "steps" in data
        assert len(data["steps"]) == 10

        # 各ステップの構造を確認
        for i, step in enumerate(data["steps"]):
            assert step["step_no"] == i
            assert "term" in step
            assert "id" in step["term"]
            assert "name" in step["term"]
            assert "era" in step["term"]
            assert "tags" in step["term"]
            assert "description" in step["term"]

            # 最後のステップ以外はchoicesとcorrect_next_idがある
            if i < 9:
                assert "correct_next_id" in step
                assert step["correct_next_id"] is not None
                assert "choices" in step
                assert len(step["choices"]) == 4  # 4択

                # 正解が選択肢に含まれているか確認
                choice_ids = [c["term_id"] for c in step["choices"]]
                assert step["correct_next_id"] in choice_ids
            else:
                # 最後のステップにはcorrect_next_idがNone
                assert step["correct_next_id"] is None
                assert len(step["choices"]) == 0  # 最後は選択肢なし

    def test_game_start_full_choices_quality(self, client, db_session):
        """選択肢の品質を確認（正解+ダミー3つ、シャッフル済み）"""
        response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()

        # 各ステップの選択肢をチェック
        for step in data["steps"][:-1]:  # 最後以外
            choices = step["choices"]
            assert len(choices) == 4

            # 各選択肢にterm_id, name, eraがある
            for choice in choices:
                assert "term_id" in choice
                assert "name" in choice
                assert "era" in choice

            # 正解が含まれている
            correct_id = step["correct_next_id"]
            choice_ids = [c["term_id"] for c in choices]
            assert correct_id in choice_ids

    def test_game_start_relation_data(self, client, db_session):
        """リレーション情報が正しく含まれているか確認"""
        response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()

        # 最後のステップ以外はリレーション情報がある
        missing_relations = []
        for i, step in enumerate(data["steps"][:-1]):
            # relation_type、keyword、relation_descriptionフィールドが存在
            assert "relation_type" in step
            assert "keyword" in step
            assert "relation_description" in step

            # 型の確認
            assert isinstance(step["relation_type"], str)
            assert isinstance(step["keyword"], str)
            assert isinstance(step["relation_description"], str)

            # データが空の場合、どのステップかを記録
            if not step["relation_type"] and not step["keyword"] and not step["relation_description"]:
                src_id = step["term"]["id"]
                dst_id = step["correct_next_id"]
                missing_relations.append({
                    "step_no": i,
                    "src_id": src_id,
                    "dst_id": dst_id,
                    "src_name": step["term"]["name"]
                })

        # リレーションが欠けている場合、詳細情報を表示してテスト失敗
        if missing_relations:
            error_msg = f"Missing relations found:\n"
            for rel in missing_relations:
                error_msg += f"  Step {rel['step_no']}: {rel['src_name']} (id={rel['src_id']}) -> term_id={rel['dst_id']}\n"
            pytest.fail(error_msg)

        # 最後のステップはリレーション情報が空
        last_step = data["steps"][-1]
        assert last_step["relation_type"] == ""
        assert last_step["keyword"] == ""
        assert last_step["relation_description"] == ""

    def test_game_start_invalid_era(self, client, db_session):
        """存在しない時代でエラー"""
        response = client.post(
            "/api/v1/games/start",
            json={"era": "invalid_era_xyz", "target_length": 10}
        )

        assert response.status_code == 400
        assert "era" in response.json()["detail"].lower() or "term" in response.json()["detail"].lower()


class TestGameResult:
    """POST /games/{game_id}/result エンドポイントのテスト"""

    def test_submit_result_success(self, client, db_session):
        """ゲーム結果を正常に送信"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # 結果送信
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "final_score": 1500,
                "final_lives": 2,
                "is_completed": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == game_id
        assert data["final_score"] == 1500
        assert data["final_lives"] == 2
        assert data["is_completed"] is True
        assert "message" in data

        # DBが更新されていることを確認
        from sqlalchemy import text
        game_result = db_session.execute(
            text("SELECT score, lives, is_finished FROM games WHERE id = :game_id"),
            {"game_id": game_id}
        ).fetchone()
        assert game_result[0] == 1500  # score
        assert game_result[1] == 2     # lives
        assert game_result[2] is True  # is_finished

    def test_submit_result_game_not_found(self, client, db_session):
        """存在しないゲームIDで404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.post(
            f"/api/v1/games/{fake_uuid}/result",
            json={
                "final_score": 1000,
                "final_lives": 1,
                "is_completed": False
            }
        )

        assert response.status_code == 404

    def test_submit_result_game_over(self, client, db_session):
        """ゲームオーバー時のメッセージ確認"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # ゲームオーバーで結果送信
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "final_score": 500,
                "final_lives": 0,
                "is_completed": False
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_completed"] is False
        assert "ゲームオーバー" in data["message"]
        assert "500" in data["message"]
