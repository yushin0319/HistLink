"""
ルートAPI (GET /routes) のテスト
"""
import pytest
from sqlalchemy import text


class TestGetRoutes:
    """GET /routes エンドポイントのテスト"""

    def test_get_routes_empty(self, client, db_session):
        """ルートが0件の場合、空リストを返す"""
        response = client.get("/api/v1/routes")

        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        assert "total" in data
        assert data["routes"] == []
        assert data["total"] == 0

    def test_get_routes_with_data(self, client, db_session):
        """ルートが存在する場合、一覧を返す"""
        # テスト用ルートを作成
        db_session.execute(
            text("""
                INSERT INTO routes (id, start_term_id, length, difficulty)
                VALUES (1, 1, 10, 'standard')
            """)
        )
        db_session.commit()

        response = client.get("/api/v1/routes")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["routes"]) == 1
        assert data["routes"][0]["id"] == 1
        assert data["routes"][0]["start_term_id"] == 1
        assert data["routes"][0]["length"] == 10
        assert data["routes"][0]["difficulty"] == "standard"

    def test_get_routes_multiple(self, client, db_session):
        """複数のルートを返す"""
        # 3つのテスト用ルートを作成
        for i in range(1, 4):
            db_session.execute(
                text(f"""
                    INSERT INTO routes (id, start_term_id, length)
                    VALUES ({i}, {i}, {i * 5})
                """)
            )
        db_session.commit()

        response = client.get("/api/v1/routes")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["routes"]) == 3
