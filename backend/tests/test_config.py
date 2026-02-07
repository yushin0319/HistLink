"""Configuration tests"""
import os
import pytest
from unittest.mock import patch


class TestSettings:
    """Settings class tests"""

    def test_settings_import(self):
        """Test settings can be imported"""
        from app.config import settings
        assert settings is not None

    def test_default_database_url(self):
        """Test default database_url"""
        from app.config import Settings
        s = Settings()
        assert "postgresql://" in s.database_url
        assert "histlink" in s.database_url

    def test_default_db_host(self):
        """Test default db_host"""
        from app.config import Settings
        s = Settings()
        assert s.db_host == "localhost"

    def test_default_db_port(self):
        """Test default db_port"""
        from app.config import Settings
        s = Settings()
        assert s.db_port == 5432

    def test_default_db_name(self):
        """Test default db_name"""
        from app.config import Settings
        s = Settings()
        assert s.db_name == "histlink"

    def test_default_db_user(self):
        """Test default db_user"""
        from app.config import Settings
        s = Settings()
        assert s.db_user == "histlink_user"

    def test_default_api_prefix(self):
        """Test default api_v1_prefix"""
        from app.config import Settings
        s = Settings()
        assert s.api_v1_prefix == "/api/v1"

    def test_default_project_name(self):
        """Test default project_name"""
        from app.config import Settings
        s = Settings()
        assert s.project_name == "HistLink API"

    def test_default_cors_origins(self):
        """Test default cors_origins"""
        from app.config import Settings
        s = Settings()
        assert "http://localhost:5173" in s.cors_origins

    def test_settings_singleton(self):
        """Test settings is the same instance"""
        from app.config import settings as s1
        from app.config import settings as s2
        assert s1 is s2

    def test_env_override(self):
        """Test environment variable can override settings"""
        with patch.dict(os.environ, {"DB_HOST": "testhost"}):
            from app.config import Settings
            s = Settings()
            assert s.db_host == "testhost"

    def test_case_insensitive(self):
        """Test settings are case insensitive for env vars"""
        from app.config import Settings
        # Config class has case_sensitive = False
        assert Settings.model_config.get("case_sensitive") is False
