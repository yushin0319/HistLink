"""ルート関連のスキーマ"""
from pydantic import BaseModel
from typing import Optional


class RouteResponse(BaseModel):
    """ルートレスポンス"""
    id: int
    name: Optional[str] = None
    start_term_id: int
    length: int
    difficulty: Optional[str] = None

    class Config:
        from_attributes = True


class RouteListResponse(BaseModel):
    """ルート一覧レスポンス"""
    routes: list[RouteResponse]
    total: int
