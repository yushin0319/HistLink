"""
ゲーム結果・更新・全体ランキングAPI のテスト

- POST /games/{game_id}/result
- PATCH /games/{game_id}
- GET /games/rankings/overall
"""
import pytest


class TestGameResult:
    """POST /games/{game_id}/result エンドポイントのテスト"""

    def test_submit_result_success(self, client, db_session):
        """ゲーム結果を正常に送信"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # 結果送信（base_score: タイマーベースの素点、ライフボーナスはサーバーが計算）
        # max_base_score = cleared_steps * 200 = 8 * 200 = 1600
        # サーバー計算: final_score = 400 + 2 * 300 = 1000
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 400,
                "final_lives": 2,
                "cleared_steps": 8
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == game_id
        assert data["difficulty"] == "hard"
        assert data["total_steps"] == 10  # target_length=10 → 11ノード → 10エッジ
        assert data["final_score"] == 1000  # base_score(400) + life_bonus(2*300)
        assert data["final_lives"] == 2
        assert data["cleared_steps"] == 8
        assert data["user_name"] == "GUEST"  # デフォルト値

        # ランキング情報が含まれている
        assert "my_rank" in data
        assert data["my_rank"] >= 1
        assert "rankings" in data
        assert isinstance(data["rankings"], list)

        # DBが更新されていることを確認（scoreはサーバー計算のfinal_score）
        from sqlalchemy import text
        game_result = db_session.execute(
            text("SELECT score, lives, cleared_steps, user_name FROM games WHERE id = :game_id"),
            {"game_id": game_id}
        ).fetchone()
        assert game_result[0] == 1000    # final_score = 400 + 2*300
        assert game_result[1] == 2       # lives
        assert game_result[2] == 8       # cleared_steps
        assert game_result[3] == "GUEST" # user_name

    def test_submit_result_game_not_found(self, client, db_session):
        """存在しないゲームIDで404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.post(
            f"/api/v1/games/{fake_uuid}/result",
            json={
                "base_score": 100,
                "final_lives": 1,
                "cleared_steps": 5
            }
        )

        assert response.status_code == 404

    def test_submit_result_with_custom_name(self, client, db_session):
        """カスタムユーザー名でゲーム結果を送信"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # カスタム名で結果送信
        # max_base_score = 3 * 200 = 600
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 150,
                "final_lives": 0,
                "cleared_steps": 3,
                "user_name": "TestPlayer"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cleared_steps"] == 3
        assert data["user_name"] == "TestPlayer"

        # DBが更新されていることを確認
        from sqlalchemy import text
        game_result = db_session.execute(
            text("SELECT user_name FROM games WHERE id = :game_id"),
            {"game_id": game_id}
        ).fetchone()
        assert game_result[0] == "TestPlayer"

    def test_submit_result_with_false_steps(self, client, db_session):
        """false_stepsを含むゲーム結果を正常に送信"""
        # ゲーム開始（10問）
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 100,
                "final_lives": 0,
                "cleared_steps": 9,
                "false_steps": [3, 6, 9]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cleared_steps"] == 9
        # ライフ0なのでボーナスなし
        assert data["final_score"] == 100

    def test_submit_result_invalid_false_steps_index(self, client, db_session):
        """不正なfalse_stepsインデックスで400エラー"""
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 10}
        )
        game_id = start_response.json()["game_id"]

        # false_stepsに範囲外のインデックス（10は無効、0-9が有効）
        response = client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 0,
                "final_lives": 0,
                "cleared_steps": 5,
                "false_steps": [1, 10]
            }
        )

        assert response.status_code == 400


class TestGameUpdate:
    """PATCH /games/{game_id} エンドポイントのテスト"""

    def test_update_user_name(self, client, db_session):
        """ユーザー名を変更"""
        # ゲーム開始
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )
        game_id = start_response.json()["game_id"]

        # 結果送信（GUESTで）
        client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 300,
                "final_lives": 3,
                "cleared_steps": 5
            }
        )

        # 名前を変更
        response = client.patch(
            f"/api/v1/games/{game_id}",
            json={"user_name": "NewName"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_name"] == "NewName"
        assert data["final_score"] == 1200  # base_score(300) + life_bonus(3*300)
        assert data["final_lives"] == 3

        # ランキング情報が含まれている
        assert "my_rank" in data
        assert "rankings" in data

        # DBが更新されていることを確認
        from sqlalchemy import text
        game_result = db_session.execute(
            text("SELECT user_name FROM games WHERE id = :game_id"),
            {"game_id": game_id}
        ).fetchone()
        assert game_result[0] == "NewName"

    def test_update_game_not_found(self, client, db_session):
        """存在しないゲームIDで404エラー"""
        fake_uuid = "12345678-1234-1234-1234-123456789012"
        response = client.patch(
            f"/api/v1/games/{fake_uuid}",
            json={"user_name": "NewName"}
        )

        assert response.status_code == 404


class TestOverallRanking:
    """GET /games/rankings/overall エンドポイントのテスト"""

    def test_get_overall_ranking_empty(self, client, db_session):
        """ゲームがない状態で全体ランキングを取得"""
        response = client.get("/api/v1/games/rankings/overall")

        assert response.status_code == 200
        data = response.json()
        assert "my_rank" in data
        assert "rankings" in data
        assert isinstance(data["rankings"], list)

    def test_get_overall_ranking_with_score(self, client, db_session):
        """自分のスコアを指定して全体ランキングを取得"""
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id = start_response.json()["game_id"]

        client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 200,
                "final_lives": 2,
                "cleared_steps": 5,
                "user_name": "Player1"
            }
        )

        response = client.get(
            "/api/v1/games/rankings/overall",
            params={"my_score": 500}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["my_rank"] >= 1
        assert len(data["rankings"]) >= 1

        if len(data["rankings"]) > 0:
            entry = data["rankings"][0]
            assert "rank" in entry
            assert "user_name" in entry
            assert "score" in entry
            assert "cleared_steps" in entry

    def test_get_overall_ranking_with_multiple_games(self, client, db_session):
        """複数のゲームがある状態で全体ランキングを取得"""
        base_scores = [200, 150, 100, 50]
        for i, base_score in enumerate(base_scores):
            start_response = client.post(
                "/api/v1/games/start",
                json={"difficulty": "normal", "target_length": 5}
            )
            game_id = start_response.json()["game_id"]

            client.post(
                f"/api/v1/games/{game_id}/result",
                json={
                    "base_score": base_score,
                    "final_lives": 3,
                    "cleared_steps": 5,
                    "user_name": f"Player{i+1}"
                }
            )

        response = client.get(
            "/api/v1/games/rankings/overall",
            params={"my_score": 720}
        )

        assert response.status_code == 200
        data = response.json()

        # ランキングがスコア順にソートされている
        rankings = data["rankings"]
        for i in range(len(rankings) - 1):
            assert rankings[i]["score"] >= rankings[i + 1]["score"]

        assert data["my_rank"] >= 1
        assert isinstance(data["my_rank"], int)
