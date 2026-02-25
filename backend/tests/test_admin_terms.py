"""Admin Terms API tests

Tests for /admin/terms CRUD, pagination, and auth operations.
"""
import pytest
from tests.conftest import requires_db

ADMIN_SECRET = "test-admin-secret-for-testing"
AUTH_HEADERS = {"Authorization": f"Bearer {ADMIN_SECRET}"}


@pytest.fixture(autouse=True)
def set_admin_secret(monkeypatch):
    """全テストでADMIN_SECRET環境変数を設定"""
    monkeypatch.setenv("ADMIN_SECRET", ADMIN_SECRET)


class TestAdminAuth:
    """認証テスト"""

    @requires_db
    def test_returns_401_without_token(self, client):
        """認証なしでアクセスすると401"""
        response = client.get("/admin/terms")
        assert response.status_code == 401

    @requires_db
    def test_returns_401_with_invalid_token(self, client):
        """無効なトークンで401"""
        response = client.get(
            "/admin/terms",
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert response.status_code == 401

    @requires_db
    def test_returns_200_with_valid_token(self, client):
        """正しいトークンで200"""
        response = client.get("/admin/terms", headers=AUTH_HEADERS)
        assert response.status_code == 200


class TestTermsCRUD:
    """Terms CRUD操作テスト"""

    @requires_db
    def test_create_term(self, client, db_session):
        """新規Term作成"""
        response = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={
                "name": "テスト用語",
                "category": "テストカテゴリ",
                "description": "テスト説明",
                "tier": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "テスト用語"
        assert data["category"] == "テストカテゴリ"
        assert data["description"] == "テスト説明"
        assert data["tier"] == 1
        assert "id" in data

    @requires_db
    def test_create_term_normalizes_tier(self, client, db_session):
        """tierが1,3以外は2に正規化される"""
        response = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={"name": "Tier5Test", "category": "cat", "tier": 5},
        )
        assert response.status_code == 200
        assert response.json()["tier"] == 2

    @requires_db
    def test_create_term_tier3(self, client, db_session):
        """tier=3はそのまま保持"""
        response = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={"name": "Tier3Test", "category": "cat", "tier": 3},
        )
        assert response.status_code == 200
        assert response.json()["tier"] == 3

    @requires_db
    def test_get_term_by_id(self, client, db_session):
        """IDでTerm取得"""
        create_resp = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={"name": "GetTest", "category": "cat", "description": "desc", "tier": 1},
        )
        term_id = create_resp.json()["id"]

        response = client.get(f"/admin/terms/{term_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == term_id
        assert data["name"] == "GetTest"

    @requires_db
    def test_get_term_not_found(self, client, db_session):
        """存在しないTerm IDで404"""
        response = client.get("/admin/terms/999999", headers=AUTH_HEADERS)
        assert response.status_code == 404

    @requires_db
    def test_update_term(self, client, db_session):
        """Term更新"""
        create_resp = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={"name": "Before", "category": "cat", "tier": 1},
        )
        term_id = create_resp.json()["id"]

        response = client.put(
            f"/admin/terms/{term_id}",
            headers=AUTH_HEADERS,
            json={"name": "After", "category": "updated", "description": "new desc", "tier": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "After"
        assert data["category"] == "updated"
        assert data["tier"] == 3

    @requires_db
    def test_update_term_not_found(self, client, db_session):
        """存在しないTerm更新で404"""
        response = client.put(
            "/admin/terms/999999",
            headers=AUTH_HEADERS,
            json={"name": "x", "category": "x", "tier": 1},
        )
        assert response.status_code == 404

    @requires_db
    def test_delete_term(self, client, db_session):
        """Term削除"""
        create_resp = client.post(
            "/admin/terms",
            headers=AUTH_HEADERS,
            json={"name": "ToDelete", "category": "cat", "tier": 1},
        )
        term_id = create_resp.json()["id"]

        response = client.delete(f"/admin/terms/{term_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert response.json()["message"] == "Term deleted"

        get_resp = client.get(f"/admin/terms/{term_id}", headers=AUTH_HEADERS)
        assert get_resp.status_code == 404

    @requires_db
    def test_delete_term_not_found(self, client, db_session):
        """存在しないTerm削除で404"""
        response = client.delete("/admin/terms/999999", headers=AUTH_HEADERS)
        assert response.status_code == 404

    @requires_db
    def test_delete_term_cascades_edges(self, client, db_session):
        """Term削除時に関連Edgeも削除される"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "CascadeA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "CascadeB", "category": "cat", "tier": 1},
        ).json()

        edge_resp = client.post(
            "/admin/edges", headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "cascade test",
                "difficulty": "easy",
            },
        )
        edge_id = edge_resp.json()["id"]

        client.delete(f"/admin/terms/{t1['id']}", headers=AUTH_HEADERS)

        edge_check = client.get(f"/admin/edges/{edge_id}", headers=AUTH_HEADERS)
        assert edge_check.status_code == 404


class TestTermsPagination:
    """Terms一覧のページネーション・ソートテスト"""

    @requires_db
    def test_list_terms_returns_paginated_response(self, client, db_session):
        """ページネーションレスポンス形式"""
        response = client.get("/admin/terms?limit=5", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) <= 5

    @requires_db
    def test_list_terms_with_sort(self, client, db_session):
        """ソートパラメータ動作確認"""
        response = client.get(
            "/admin/terms?sort_by=name&sort_order=desc&limit=5",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200

    @requires_db
    def test_list_terms_invalid_sort_field(self, client, db_session):
        """無効なソートフィールドで400"""
        response = client.get(
            "/admin/terms?sort_by=invalid_field",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 400

    @requires_db
    def test_list_all_terms_from_cache(self, client, db_session):
        """/terms/all はキャッシュから全件返す"""
        response = client.get("/admin/terms/all", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTermEdges:
    """Term関連Edge取得テスト"""

    @requires_db
    def test_get_term_edges(self, client, db_session):
        """Termに紐づくEdge一覧取得"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "TermEdgeA", "category": "cat", "tier": 1},
        ).json()
        t2 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "TermEdgeB", "category": "cat", "tier": 1},
        ).json()
        client.post(
            "/admin/edges", headers=AUTH_HEADERS,
            json={
                "from_term_id": t1["id"],
                "to_term_id": t2["id"],
                "keyword": "term edge test",
                "difficulty": "easy",
            },
        )

        response = client.get(f"/admin/terms/{t1['id']}/edges", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["keyword"] == "term edge test"

    @requires_db
    def test_get_term_edges_empty(self, client, db_session):
        """EdgeのないTermでは空リスト"""
        t1 = client.post(
            "/admin/terms", headers=AUTH_HEADERS,
            json={"name": "NoEdges", "category": "cat", "tier": 1},
        ).json()

        response = client.get(f"/admin/terms/{t1['id']}/edges", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert response.json() == []
