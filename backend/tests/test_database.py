"""Database connection tests"""
import pytest
from sqlalchemy import text


def test_database_connection(db_session):
    """Test database connection"""
    result = db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1


def test_terms_table_exists(db_session):
    """Test that terms table exists"""
    result = db_session.execute(
        text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'terms')")
    )
    assert result.scalar() is True


def test_relations_table_exists(db_session):
    """Test that relations table exists"""
    result = db_session.execute(
        text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relations')"
        )
    )
    assert result.scalar() is True


def test_terms_exist(db_session):
    """Test that terms exist"""
    result = db_session.execute(text("SELECT COUNT(*) FROM terms"))
    count = result.scalar()
    assert count > 0


def test_relations_exist(db_session):
    """Test that relations exist"""
    result = db_session.execute(text("SELECT COUNT(*) FROM relations"))
    count = result.scalar()
    assert count > 0


def test_sample_term(db_session):
    """Test reading a sample term"""
    result = db_session.execute(
        text("SELECT name, era FROM terms WHERE name = '縄文時代'")
    )
    row = result.fetchone()
    assert row is not None
    assert row[0] == "縄文時代"
    assert row[1] == "古代"


def test_get_db():
    """Test get_db dependency function"""
    from app.database import get_db

    # get_db()はgeneratorなので、next()で取得
    db_gen = get_db()
    db = next(db_gen)

    # セッションが正しく動作するかテスト
    result = db.execute(text("SELECT 1"))
    assert result.scalar() == 1

    # クリーンアップ（generatorを終了させる）
    try:
        next(db_gen)
    except StopIteration:
        pass  # 正常終了
