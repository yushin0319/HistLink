"""Configuration settings for HistLink backend"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_url: str  # 必須。.env または環境変数で設定
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "histlink"
    db_user: str = "histlink_user"
    db_password: str = ""

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "HistLink API"

    # CORS（環境変数 CORS_ORIGINS で上書き可能。JSON配列形式: '["http://localhost","https://example.com"]'）
    cors_origins: list[str] = [
        "http://localhost:5173",           # ローカル開発 (frontend)
        "http://localhost:5174",           # ローカル開発 (studio)
        "https://histlink.onrender.com",   # 本番フロントエンド
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
