"""
ゲームAPI (POST /games/start) のテスト
"""
import pytest
from uuid import UUID


class TestGameStart:
    """POST /games/start エンドポイントのテスト"""

    def test_game_start_basic(self, client, db_session):
        """基本的なゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "standard", "target_length": 10}
        )

        assert response.status_code == 200
        data = response.json()

        # game_idがUUIDであることを確認
        assert "game_id" in data
        UUID(data["game_id"])  # 無効なUUIDならエラー

        # 初期状態を確認
        assert data["current_step"] == 0
        assert data["lives"] == 3
        assert data["score"] == 0
        assert data["chain_count"] == 0
        assert data["is_finished"] is False

        # current_termが存在
        assert "current_term" in data
        assert "id" in data["current_term"]
        assert "name" in data["current_term"]
        assert "era" in data["current_term"]

    def test_game_start_with_era_filter(self, client, db_session):
        """時代フィルタ付きでゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"era": "古代", "target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_term"]["era"] == "古代"

    def test_game_start_creates_route_and_game(self, client, db_session):
        """ゲーム開始時にroutesとgamesテーブルにレコードが作成される"""
        from sqlalchemy import text

        # 初期状態を確認
        routes_count_before = db_session.execute(
            text("SELECT COUNT(*) FROM routes")
        ).fetchone()[0]
        games_count_before = db_session.execute(
            text("SELECT COUNT(*) FROM games")
        ).fetchone()[0]

        # ゲーム開始
        response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )

        assert response.status_code == 200

        # レコードが増えていることを確認
        routes_count_after = db_session.execute(
            text("SELECT COUNT(*) FROM routes")
        ).fetchone()[0]
        games_count_after = db_session.execute(
            text("SELECT COUNT(*) FROM games")
        ).fetchone()[0]

        assert routes_count_after == routes_count_before + 1
        assert games_count_after == games_count_before + 1

    def test_game_start_invalid_era(self, client, db_session):
        """存在しない時代を指定した場合400エラー"""
        response = client.post(
            "/api/v1/games/start",
            json={"era": "未来", "target_length": 10}
        )

        assert response.status_code == 400
        assert "No terms found" in response.json()["detail"]

    def test_game_start_invalid_target_length(self, client, db_session):
        """無効なtarget_lengthの場合422エラー"""
        # 最小値未満
        response = client.post(
            "/api/v1/games/start",
            json={"target_length": 3}  # 最小5
        )
        assert response.status_code == 422

        # 最大値超過
        response = client.post(
            "/api/v1/games/start",
            json={"target_length": 100}  # 最大50
        )
        assert response.status_code == 422


class TestGetGameState:
    """GET /games/{game_id} エンドポイントのテスト"""

    def test_get_game_state_success(self, client, db_session):
        """存在するゲームの状態を取得"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # ゲーム状態を取得
        response = client.get(f"/api/v1/games/{game_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == game_id
        assert data["current_step"] == 0
        assert data["lives"] == 3
        assert data["score"] == 0
        assert data["chain_count"] == 0
        assert data["is_finished"] is False
        assert "current_term" in data

    def test_get_game_state_not_found(self, client, db_session):
        """存在しないゲームIDで404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.get(f"/api/v1/games/{fake_uuid}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_game_state_invalid_uuid(self, client, db_session):
        """無効なUUID形式で422エラー"""
        response = client.get("/api/v1/games/invalid-uuid")

        assert response.status_code == 422


class TestGetChoices:
    """GET /games/{game_id}/choices エンドポイントのテスト"""

    def test_get_choices_success(self, client, db_session):
        """4択選択肢を取得"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # 選択肢を取得
        response = client.get(f"/api/v1/games/{game_id}/choices")

        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == game_id
        assert data["current_step"] == 0
        assert "current_term" in data
        assert "choices" in data
        assert len(data["choices"]) == 4  # 4択

        # 各選択肢にterm_id, name, eraがある
        for choice in data["choices"]:
            assert "term_id" in choice
            assert "name" in choice
            assert "era" in choice

    def test_get_choices_game_not_found(self, client, db_session):
        """存在しないゲームIDで404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.get(f"/api/v1/games/{fake_uuid}/choices")

        assert response.status_code == 404

    def test_get_choices_finished_game(self, client, db_session):
        """終了したゲームで400エラー"""
        from sqlalchemy import text

        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )
        game_id = start_response.json()["game_id"]

        # ゲームを終了状態にする
        db_session.execute(
            text("UPDATE games SET is_finished = true WHERE id = :game_id"),
            {"game_id": game_id}
        )
        db_session.commit()

        # 選択肢を取得しようとする
        response = client.get(f"/api/v1/games/{game_id}/choices")

        assert response.status_code == 400
        assert "finished" in response.json()["detail"].lower()


class TestPostAnswer:
    """POST /games/{game_id}/answer エンドポイントのテスト"""

    def test_answer_correct(self, client, db_session):
        """正解を選択した場合"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # 選択肢を取得
        choices_response = client.get(f"/api/v1/games/{game_id}/choices")
        choices = choices_response.json()["choices"]

        # 正解を見つける（route_stepsからstep 1のterm_idを取得）
        from sqlalchemy import text
        route_id = start_response.json()["route_id"]
        result = db_session.execute(
            text("SELECT term_id FROM route_steps WHERE route_id = :route_id AND step_no = 1"),
            {"route_id": route_id}
        ).fetchone()
        correct_term_id = result[0]

        # 回答
        answer_response = client.post(
            f"/api/v1/games/{game_id}/answer",
            json={"selected_term_id": correct_term_id}
        )

        assert answer_response.status_code == 200
        data = answer_response.json()
        assert data["is_correct"] is True
        assert data["correct_term_id"] == correct_term_id
        assert data["game_state"]["current_step"] == 1  # 進んだ
        assert data["game_state"]["chain_count"] == 1  # 連鎖+1
        assert data["game_state"]["lives"] == 3  # ライフそのまま
        assert data["game_state"]["score"] > 0  # スコア加算

    def test_answer_incorrect(self, client, db_session):
        """不正解を選択した場合"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]
        route_id = start_response.json()["route_id"]

        # 正解を特定
        from sqlalchemy import text
        result = db_session.execute(
            text("SELECT term_id FROM route_steps WHERE route_id = :route_id AND step_no = 1"),
            {"route_id": route_id}
        ).fetchone()
        correct_term_id = result[0]

        # 選択肢を取得して不正解を選ぶ
        choices_response = client.get(f"/api/v1/games/{game_id}/choices")
        choices = choices_response.json()["choices"]
        incorrect_term_id = next(c["term_id"] for c in choices if c["term_id"] != correct_term_id)

        # 回答
        answer_response = client.post(
            f"/api/v1/games/{game_id}/answer",
            json={"selected_term_id": incorrect_term_id}
        )

        assert answer_response.status_code == 200
        data = answer_response.json()
        assert data["is_correct"] is False
        assert data["correct_term_id"] == correct_term_id
        assert data["game_state"]["current_step"] == 0  # 進まない
        assert data["game_state"]["chain_count"] == 0  # 連鎖リセット
        assert data["game_state"]["lives"] == 2  # ライフ-1

    def test_answer_game_over(self, client, db_session):
        """ライフ0でゲームオーバー"""
        from sqlalchemy import text

        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # ライフを1に設定
        db_session.execute(
            text("UPDATE games SET lives = 1 WHERE id = :game_id"),
            {"game_id": game_id}
        )
        db_session.commit()

        # 不正解を選択してライフ0に
        route_id = start_response.json()["route_id"]
        correct_result = db_session.execute(
            text("SELECT term_id FROM route_steps WHERE route_id = :route_id AND step_no = 1"),
            {"route_id": route_id}
        ).fetchone()
        correct_term_id = correct_result[0]

        choices_response = client.get(f"/api/v1/games/{game_id}/choices")
        choices = choices_response.json()["choices"]
        incorrect_term_id = next(c["term_id"] for c in choices if c["term_id"] != correct_term_id)

        answer_response = client.post(
            f"/api/v1/games/{game_id}/answer",
            json={"selected_term_id": incorrect_term_id}
        )

        assert answer_response.status_code == 200
        data = answer_response.json()
        assert data["game_state"]["lives"] == 0
        assert data["game_state"]["is_finished"] is True  # ゲームオーバー

    def test_answer_finished_game(self, client, db_session):
        """終了したゲームで回答しようとすると400エラー"""
        from sqlalchemy import text

        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )
        game_id = start_response.json()["game_id"]

        # ゲームを終了状態にする
        db_session.execute(
            text("UPDATE games SET is_finished = true WHERE id = :game_id"),
            {"game_id": game_id}
        )
        db_session.commit()

        # 回答しようとする
        response = client.post(
            f"/api/v1/games/{game_id}/answer",
            json={"selected_term_id": 1}
        )

        assert response.status_code == 400
        assert "finished" in response.json()["detail"].lower()

    def test_answer_game_not_found(self, client, db_session):
        """存在しないゲームIDで回答すると404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.post(
            f"/api/v1/games/{fake_uuid}/answer",
            json={"selected_term_id": 1}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_answer_no_more_steps(self, client, db_session):
        """ルート最終ステップで回答すると400エラー"""
        from sqlalchemy import text

        # 短いルートでゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )
        game_id = start_response.json()["game_id"]
        route_id = start_response.json()["route_id"]

        # ルート長を取得
        route_length = db_session.execute(
            text("SELECT length FROM routes WHERE id = :route_id"),
            {"route_id": route_id}
        ).fetchone()[0]

        # current_stepをルート最終ステップに設定（length - 1）
        db_session.execute(
            text("UPDATE games SET current_step = :step WHERE id = :game_id"),
            {"game_id": game_id, "step": route_length - 1}
        )
        db_session.commit()

        # 回答しようとする
        response = client.post(
            f"/api/v1/games/{game_id}/answer",
            json={"selected_term_id": 1}
        )

        assert response.status_code == 400
        assert "no more steps" in response.json()["detail"].lower()


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_get_game_state_route_step_not_found(self, client, db_session):
        """ゲーム状態取得時にroute_stepが見つからない場合500エラー"""
        from sqlalchemy import text

        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )
        game_id = start_response.json()["game_id"]
        route_id = start_response.json()["route_id"]

        # route_stepsを削除してデータ不整合を作る
        db_session.execute(
            text("DELETE FROM route_steps WHERE route_id = :route_id"),
            {"route_id": route_id}
        )
        db_session.commit()

        # ゲーム状態を取得
        response = client.get(f"/api/v1/games/{game_id}")

        assert response.status_code == 500
        assert "route step not found" in response.json()["detail"].lower()

    def test_get_choices_no_more_steps(self, client, db_session):
        """ルート最終ステップで選択肢を取得しようとすると400エラー"""
        from sqlalchemy import text

        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"target_length": 5}
        )
        game_id = start_response.json()["game_id"]
        route_id = start_response.json()["route_id"]

        # ルート長を取得
        route_length = db_session.execute(
            text("SELECT length FROM routes WHERE id = :route_id"),
            {"route_id": route_id}
        ).fetchone()[0]

        # current_stepをルート最終ステップに設定
        db_session.execute(
            text("UPDATE games SET current_step = :step WHERE id = :game_id"),
            {"game_id": game_id, "step": route_length - 1}
        )
        db_session.commit()

        # 選択肢を取得しようとする
        response = client.get(f"/api/v1/games/{game_id}/choices")

        assert response.status_code == 400
        assert "no more steps" in response.json()["detail"].lower()
