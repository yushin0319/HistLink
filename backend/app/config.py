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
    db_password: str  # 必須。.env または環境変数で設定

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "HistLink API"

    # CORS
    cors_origins: list[str] = ["http://localhost", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
