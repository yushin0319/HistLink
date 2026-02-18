"""
ゲームAPI (POST /games/start, POST /games/{game_id}/result) のテスト（新仕様）

新難易度システム:
- easy: Tier1のみ + easyエッジのみ
- normal: Tier1-2 + easy/normalエッジ
- hard: 全Tier + 全エッジ
"""
import pytest
from uuid import UUID


class TestGameStart:
    """POST /games/start エンドポイントのテスト（全ルート+全選択肢）"""

    def test_game_start_full_basic(self, client, db_session):
        """全ルート+全選択肢を含むゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 10}
        )

        assert response.status_code == 200
        data = response.json()

        # 基本フィールドを確認
        # target_length=10 → 10回のゲーム → 11ノード（10エッジ）が必要
        assert "game_id" in data
        UUID(data["game_id"])
        assert data["difficulty"] == "normal"
        assert data["total_steps"] == 11  # 10ゲーム = 11ノード
        assert "created_at" in data

        # stepsが存在し、全ステップ分ある
        assert "steps" in data
        assert len(data["steps"]) == 11  # 10ゲーム = 11ノード

        # 各ステップの構造を確認
        for i, step in enumerate(data["steps"]):
            assert step["step_no"] == i
            assert "term" in step
            assert "id" in step["term"]
            assert "name" in step["term"]
            assert "tier" in step["term"]
            assert "category" in step["term"]
            assert "description" in step["term"]

            # 最後のステップ以外はchoicesとcorrect_next_idがある
            if i < 10:  # 10エッジ = 10回のゲーム
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

    def test_game_start_easy_difficulty(self, client, db_session):
        """Easy難易度でゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "easy", "target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["difficulty"] == "easy"

    def test_game_start_hard_difficulty(self, client, db_session):
        """Hard難易度でゲーム開始"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["difficulty"] == "hard"

    def test_game_start_full_choices_quality(self, client, db_session):
        """選択肢の品質を確認（正解+ダミー3つ、シャッフル済み）"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()

        # 各ステップの選択肢をチェック
        for step in data["steps"][:-1]:  # 最後以外
            choices = step["choices"]
            assert len(choices) == 4

            # 各選択肢にterm_id, name, tierがある
            for choice in choices:
                assert "term_id" in choice
                assert "name" in choice
                assert "tier" in choice

            # 正解が含まれている
            correct_id = step["correct_next_id"]
            choice_ids = [c["term_id"] for c in choices]
            assert correct_id in choice_ids

    def test_game_start_relation_data(self, client, db_session):
        """リレーション情報が正しく含まれているか確認"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )

        assert response.status_code == 200
        data = response.json()

        # 最後のステップ以外はエッジ情報がある
        missing_edges = []
        for i, step in enumerate(data["steps"][:-1]):
            # difficulty、keyword、edge_descriptionフィールドが存在
            assert "difficulty" in step
            assert "keyword" in step
            assert "edge_description" in step

            # 型の確認
            assert isinstance(step["difficulty"], str)
            assert isinstance(step["keyword"], str)
            assert isinstance(step["edge_description"], str)

            # データが空の場合、どのステップかを記録
            if not step["difficulty"] and not step["keyword"] and not step["edge_description"]:
                term_id = step["term"]["id"]
                next_id = step["correct_next_id"]
                missing_edges.append({
                    "step_no": i,
                    "term_id": term_id,
                    "next_id": next_id,
                    "term_name": step["term"]["name"]
                })

        # エッジが欠けている場合、詳細情報を表示してテスト失敗
        if missing_edges:
            error_msg = "Missing edges found:\n"
            for edge in missing_edges:
                error_msg += f"  Step {edge['step_no']}: {edge['term_name']} (id={edge['term_id']}) -> term_id={edge['next_id']}\n"
            pytest.fail(error_msg)

        # 最後のステップはエッジ情報が空
        last_step = data["steps"][-1]
        assert last_step["difficulty"] == ""
        assert last_step["keyword"] == ""
        assert last_step["edge_description"] == ""

    def test_game_start_invalid_difficulty(self, client, db_session):
        """不正な難易度でエラー"""
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "invalid", "target_length": 10}
        )

        assert response.status_code == 422  # Validation error


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

    def test_game_start_no_terms_error(self, client, db_session, monkeypatch):
        """termがない場合は400エラー"""
        def mock_generate_route(target_length, difficulty='hard', seed=None, max_start_retries=10, max_same_start_retries=10):
            raise ValueError("No terms found with tier <= 1")

        import app.routes.games
        monkeypatch.setattr(app.routes.games, "generate_route", mock_generate_route)

        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "easy", "target_length": 5}
        )

        assert response.status_code == 400
        assert "No terms found" in response.json()["detail"]


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
        # max_base_score = 5 * 200 = 1000
        # サーバー計算: final_score = 300 + 3 * 300 = 1200
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

    # 注：test_start_game_with_missing_relationは削除
    # キャッシュベースの設計では、起動時に全データがキャッシュされるため、
    # テスト中にDBに追加した用語/エッジはキャッシュに反映されない。
    # ルート生成はキャッシュからのみ行われるため、このテストは不要。


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
        # まずゲームを作成してスコアを登録
        start_response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "normal", "target_length": 5}
        )
        game_id = start_response.json()["game_id"]

        # max_base_score = 5 * 200 = 1000
        client.post(
            f"/api/v1/games/{game_id}/result",
            json={
                "base_score": 200,
                "final_lives": 2,
                "cleared_steps": 5,
                "user_name": "Player1"
            }
        )

        # 自分のスコアを指定してランキング取得
        response = client.get(
            "/api/v1/games/rankings/overall",
            params={"my_score": 500}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["my_rank"] >= 1
        assert len(data["rankings"]) >= 1

        # ランキングエントリの構造を確認
        if len(data["rankings"]) > 0:
            entry = data["rankings"][0]
            assert "rank" in entry
            assert "user_name" in entry
            assert "score" in entry
            assert "cleared_steps" in entry

    def test_get_overall_ranking_with_multiple_games(self, client, db_session):
        """複数のゲームがある状態で全体ランキングを取得"""
        # 複数のゲームを作成
        # max_base_score = 5 * 200 = 1000
        # サーバー計算: final_score = base_score + 3 * 200 = base_score + 600
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

        # ランキング取得（final_scores: [800, 750, 700, 650]）
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

        # my_rankが正の整数である（既存データがある可能性があるため具体的な値はチェックしない）
        assert data["my_rank"] >= 1
        assert isinstance(data["my_rank"], int)
