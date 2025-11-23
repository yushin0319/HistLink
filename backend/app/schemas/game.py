"""ゲーム関連のスキーマ"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

from .term import TermResponse


class GameStartRequest(BaseModel):
    """ゲーム開始リクエスト"""
    difficulty: Optional[str] = "standard"
    era: Optional[str] = None
    target_length: int = Field(default=20, ge=5, le=50)


class ChoiceResponse(BaseModel):
    """選択肢レスポンス"""
    term_id: int
    name: str
    era: str

    class Config:
        from_attributes = True


class GameResultRequest(BaseModel):
    """ゲーム結果送信リクエスト"""
    final_score: int = Field(ge=0)
    final_lives: int = Field(ge=0)
    is_completed: bool


class GameResultResponse(BaseModel):
    """ゲーム結果送信レスポンス"""
    game_id: UUID
    final_score: int
    final_lives: int
    is_completed: bool
    message: str


class RouteStepWithChoices(BaseModel):
    """ルートステップと選択肢のセット"""
    step_no: int
    term: TermResponse
    correct_next_id: int | None  # 次の正解（最後のステップではNone）
    choices: list[ChoiceResponse]  # 4択（正解1 + ダミー3）
    relation_type: str  # リレーションの種類（例: "因果"）
    relation_description: str  # リレーションの説明文


class FullRouteStartResponse(BaseModel):
    """全ルート+全選択肢を含むゲーム開始レスポンス"""
    game_id: UUID
    route_id: int
    difficulty: str
    total_steps: int
    steps: list[RouteStepWithChoices]
    created_at: datetime
