"""用語関連のスキーマ"""
from pydantic import BaseModel


class TermResponse(BaseModel):
    """用語レスポンス"""
    id: int
    name: str
    tier: int
    category: str
    description: str

    class Config:
        from_attributes = True
