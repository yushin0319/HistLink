"""Pytest configuration and fixtures"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.services.cache import get_cache

# Test database URL (use environment variable or default to localhost)
# In Docker: DATABASE_URL uses postgres:5432
# In local: DATABASE_URL uses localhost:5432
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://histlink_user:histlink_dev_password@localhost:5432/histlink"
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def is_db_available() -> bool:
    """DB接続チェック（テスト起動時に一度だけ実行）"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


# DB依存テストのskipマーカー。DB未起動環境ではDB不要テストのみ実行される。
requires_db = pytest.mark.skipif(
    not is_db_available(),
    reason="Database not available"
)


@pytest.fixture(scope="session", autouse=True)
def init_cache():
    """テスト開始前にキャッシュを初期化（DB未起動時はスキップ）"""
    try:
        cache = get_cache()
        print(f"[Test Setup] Cache initialized: {len(cache.terms)} terms, {len(cache.edges)} edges")
    except Exception as e:
        print(f"[Test Setup] Cache init skipped (DB unavailable): {e}")


@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine"""
    return engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a new database session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
