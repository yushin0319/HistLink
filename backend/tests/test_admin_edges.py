"""Admin Edges & Games API tests

Tests for /admin/edges CRUD, pagination, and /admin/games operations.
"""
import pytest
from tests.conftest import requires_db

ADMIN_SECRET = "test-admin-secret-for-testing"
AUTH_HEADERS = {"Authorization": f"Bearer {ADMIN_SECRET}"}


@pytest.fixture(autouse=True)
def set_admin_secret(monkeypatch):
    """全テストでADMIN_SECRET環境変数を設定"""
    monkeypatch.setenv("ADMIN_SECRET", ADMIN_SECRET)


class TestEdgesCRUD:
    """Edges CRUD操作テスト"""

    @requires_db
    def test_create_edge(self, client, db_session):
        """新規Edge作成"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "EdgeTermA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "EdgeTermB", "category": "cat", "tier": 1},
        ).json()

        response = client.post(
            "/admin/edges",
            headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "テスト関係",
                "description": "テスト説明",
                "difficulty": "easy",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["keyword"] == "テスト関係"
        assert data["difficulty"] == "easy"
        assert "id" in data

    @requires_db
    def test_create_edge_normalizes_term_order(self, client, db_session):
        """Edge作成時にterm_a < term_bに正規化される"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "NormA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "NormB", "category": "cat", "tier": 1},
        ).json()

        bigger_id = max(t1["id"], t2["id"])
        smaller_id = min(t1["id"], t2["id"])
        response = client.post(
            "/admin/edges",
            headers=AUTH_HEADERS,
            json={
                "from_term_id": bigger_id,
                "to_term_id": smaller_id,
                "keyword": "normalize test",
                "difficulty": "normal",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_term_id"] == smaller_id
        assert data["to_term_id"] == bigger_id

    @requires_db
    def test_create_edge_rejects_self_edge(self, client, db_session):
        """自己ループEdge作成を拒否"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "SelfEdge", "category": "cat", "tier": 1},
        ).json()

        response = client.post(
            "/admin/edges",
            headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t1["id"],
                "keyword": "self",
                "difficulty": "easy",
            },
        )
        assert response.status_code == 400

    @requires_db
    def test_get_edge_by_id(self, client, db_session):
        """IDでEdge取得"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "GetEdgeA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "GetEdgeB", "category": "cat", "tier": 1},
        ).json()
        edge = client.post(
            "/admin/edges", headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "get test",
                "difficulty": "normal",
            },
        ).json()

        response = client.get(f"/admin/edges/{edge['id']}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == edge["id"]
        assert data["from_term_name"] in ["GetEdgeA", "GetEdgeB"]
        assert data["to_term_name"] in ["GetEdgeA", "GetEdgeB"]

    @requires_db
    def test_get_edge_not_found(self, client, db_session):
        """存在しないEdgeで404"""
        response = client.get("/admin/edges/999999", headers=AUTH_HEADERS)
        assert response.status_code == 404

    @requires_db
    def test_update_edge(self, client, db_session):
        """Edge更新"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "UpdEdgeA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "UpdEdgeB", "category": "cat", "tier": 1},
        ).json()
        edge = client.post(
            "/admin/edges", headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "before",
                "difficulty": "easy",
            },
        ).json()

        response = client.put(
            f"/admin/edges/{edge['id']}",
            headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "after",
                "difficulty": "hard",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["keyword"] == "after"
        assert data["difficulty"] == "hard"

    @requires_db
    def test_update_edge_not_found(self, client, db_session):
        """存在しないEdge更新で404"""
        response = client.put(
            "/admin/edges/999999",
            headers=AUTH_HEADERS,
            json={
                "from_term_id": 1,
                "to_term_id": 2,
                "keyword": "x",
                "difficulty": "easy",
            },
        )
        assert response.status_code == 404

    @requires_db
    def test_delete_edge(self, client, db_session):
        """Edge削除"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "DelEdgeA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "DelEdgeB", "category": "cat", "tier": 1},
        ).json()
        edge = client.post(
            "/admin/edges", headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "del",
                "difficulty": "easy",
            },
        ).json()

        response = client.delete(f"/admin/edges/{edge['id']}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert response.json()["message"] == "Edge deleted"

        get_resp = client.get(f"/admin/edges/{edge['id']}", headers=AUTH_HEADERS)
        assert get_resp.status_code == 404

    @requires_db
    def test_delete_edge_not_found(self, client, db_session):
        """存在しないEdge削除で404"""
        response = client.delete("/admin/edges/999999", headers=AUTH_HEADERS)
        assert response.status_code == 404


class TestEdgesPagination:
    """Edges一覧のページネーションテスト"""

    @requires_db
    def test_list_edges_returns_paginated_response(self, client, db_session):
        """ページネーションレスポンス形式"""
        response = client.get("/admin/edges?limit=5", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @requires_db
    def test_list_edges_invalid_sort_field(self, client, db_session):
        """無効なソートフィールドで400"""
        response = client.get(
            "/admin/edges?sort_by=invalid_field",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 400

    @requires_db
    def test_list_all_edges_from_cache(self, client, db_session):
        """/edges/all はキャッシュから全件返す"""
        response = client.get("/admin/edges/all", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestGamesAdmin:
    """Games管理テスト"""

    @requires_db
    def test_list_games(self, client, db_session):
        """ゲーム一覧取得"""
        response = client.get("/admin/games?limit=5", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @requires_db
    def test_list_games_invalid_sort_field(self, client, db_session):
        """無効なソートフィールドで400"""
        response = client.get(
            "/admin/games?sort_by=invalid",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 400

    @requires_db
    def test_get_game_not_found(self, client, db_session):
        """存在しないゲームで404"""
        response = client.get(
            "/admin/games/00000000-0000-0000-0000-000000000000",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    @requires_db
    def test_delete_game_returns_404(self, client, db_session):
        """Games APIはRead-only: DELETEルートは未定義で404"""
        response = client.delete(
            "/admin/games/00000000-0000-0000-0000-000000000000",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404
