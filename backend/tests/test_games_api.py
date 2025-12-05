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
        assert "game_id" in data
        UUID(data["game_id"])
        assert "route_id" in data
        assert data["difficulty"] == "normal"
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
            assert "tier" in step["term"]
            assert "category" in step["term"]
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

        # 最後のステップ以外はリレーション情報がある
        missing_relations = []
        for i, step in enumerate(data["steps"][:-1]):
            # edge_difficulty、keyword、relation_descriptionフィールドが存在
            assert "edge_difficulty" in step
            assert "keyword" in step
            assert "relation_description" in step

            # 型の確認
            assert isinstance(step["edge_difficulty"], str)
            assert isinstance(step["keyword"], str)
            assert isinstance(step["relation_description"], str)

            # データが空の場合、どのステップかを記録
            if not step["edge_difficulty"] and not step["keyword"] and not step["relation_description"]:
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
            error_msg = "Missing relations found:\n"
            for rel in missing_relations:
                error_msg += f"  Step {rel['step_no']}: {rel['src_name']} (id={rel['src_id']}) -> term_id={rel['dst_id']}\n"
            pytest.fail(error_msg)

        # 最後のステップはリレーション情報が空
        last_step = data["steps"][-1]
        assert last_step["edge_difficulty"] == ""
        assert last_step["keyword"] == ""
        assert last_step["relation_description"] == ""

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
            json={"difficulty": "hard", "target_length": 10}
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

    def test_game_start_no_terms_error(self, client, db_session, monkeypatch):
        """termがない場合は400エラー"""
        def mock_select_random_start(db, difficulty='hard'):
            raise ValueError("No terms found with tier <= 1")

        import app.routes.games
        monkeypatch.setattr(app.routes.games, "select_random_start", mock_select_random_start)

        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "easy", "target_length": 5}
        )

        assert response.status_code == 400
        assert "No terms found" in response.json()["detail"]

    def test_start_game_with_missing_relation(self, client, db_session, monkeypatch):
        """リレーションが存在しない場合でもゲームが開始できる（防御的コード）"""
        from sqlalchemy import text

        # テスト用の用語を5つ作成（新スキーマ: tier, category）
        term_ids = []
        for i in range(5):
            term_result = db_session.execute(
                text("""
                    INSERT INTO terms (name, tier, category, description)
                    VALUES (:name, 1, 'テスト', :desc)
                    RETURNING id
                """),
                {"name": f"テスト用語{i+1}", "desc": f"説明{i+1}"}
            )
            term_ids.append(term_result.fetchone()[0])

        # term1 → term2 のリレーションを作成しない（意図的に欠落）

        # 残りのステップ用にリレーションを作成（新スキーマ: source, target, difficulty）
        for i in range(1, 4):
            db_session.execute(
                text("""
                    INSERT INTO relations (source, target, difficulty, keyword, explanation)
                    VALUES (:source, :target, 'normal', 'テストキーワード', 'テスト説明')
                """),
                {"source": term_ids[i], "target": term_ids[i+1]}
            )

        # ダミー選択肢用の用語を追加
        distractor_ids = []
        for i in range(12):  # 4ステップ × 3個
            distractor_result = db_session.execute(
                text("""
                    INSERT INTO terms (name, tier, category, description)
                    VALUES (:name, 1, 'ダミー', 'ダミー')
                    RETURNING id
                """),
                {"name": f"ダミー用語{i}"}
            )
            distractor_ids.append(distractor_result.fetchone()[0])

        db_session.commit()

        # ルート生成をモック
        def mock_select_random_start(db, difficulty='hard'):
            return term_ids[0]

        def mock_generate_route(start_term_id, target_length, db, difficulty='hard'):
            return term_ids[:5]  # 5ステップのルート

        # ダミー選択肢生成をモック（3個ずつ返す）
        distractor_counter = [0]
        def mock_generate_distractors(correct_id, current_id, visited, difficulty, count, db):
            start_idx = distractor_counter[0] * count
            distractor_counter[0] += 1
            return distractor_ids[start_idx:start_idx + count]

        # モックを適用
        import app.routes.games
        monkeypatch.setattr(app.routes.games, "select_random_start", mock_select_random_start)
        monkeypatch.setattr(app.routes.games, "generate_route", mock_generate_route)
        monkeypatch.setattr(app.routes.games, "generate_distractors", mock_generate_distractors)

        # ゲーム開始（モックにより term1 → term2 → ... のルートが使われる）
        response = client.post(
            "/api/v1/games/start",
            json={"difficulty": "hard", "target_length": 5}
        )

        # リレーションが見つからなくても、ゲームは正常に開始される
        assert response.status_code == 200
        data = response.json()
        assert "game_id" in data
        assert "steps" in data
        assert len(data["steps"]) == 5

        # 防御的コードにより、最初のステップのedge_difficulty, keyword, relation_descriptionがデフォルト値になる
        first_step = data["steps"][0]
        assert first_step["term"]["id"] == term_ids[0]
        assert first_step["correct_next_id"] == term_ids[1]
        assert first_step["edge_difficulty"] == "normal"  # デフォルト値
        assert first_step["keyword"] == ""
        assert first_step["relation_description"] == ""

        # 2番目以降のステップはリレーションが存在する
        second_step = data["steps"][1]
        assert second_step["edge_difficulty"] == "normal"
        assert second_step["keyword"] == "テストキーワード"
        assert second_step["relation_description"] == "テスト説明"
