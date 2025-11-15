"""Configuration settings for HistLink backend"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_url: str = "postgresql://histlink_user:histlink_dev_password@localhost:5432/histlink"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "histlink"
    db_user: str = "histlink_user"
    db_password: str = "histlink_dev_password"

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "HistLink API"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = "../.env"
        case_sensitive = False


settings = Settings()
