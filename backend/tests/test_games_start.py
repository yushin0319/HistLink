"""
ゲーム開始API (POST /games/start) のテスト

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
