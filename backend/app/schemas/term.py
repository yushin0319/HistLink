"""用語関連のスキーマ"""
from pydantic import BaseModel


class TermResponse(BaseModel):
    """用語レスポンス"""
    id: int
    name: str
    era: str
    tags: list[str]

    class Config:
        from_attributes = True
