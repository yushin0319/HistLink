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


class GameStateResponse(BaseModel):
    """ゲーム状態レスポンス"""
    game_id: UUID
    route_id: int
    current_step: int
    current_term: TermResponse
    lives: int
    score: int
    chain_count: int
    is_finished: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GameStartResponse(GameStateResponse):
    """ゲーム開始レスポンス（GameStateResponseと同じ）"""
    pass


class ChoiceResponse(BaseModel):
    """選択肢レスポンス"""
    term_id: int
    name: str
    era: str

    class Config:
        from_attributes = True


class ChoicesResponse(BaseModel):
    """4択選択肢レスポンス"""
    game_id: UUID
    current_step: int
    current_term: TermResponse
    choices: list[ChoiceResponse]


class AnswerRequest(BaseModel):
    """回答リクエスト"""
    selected_term_id: int


class AnswerResponse(BaseModel):
    """回答結果レスポンス"""
    is_correct: bool
    correct_term_id: int
    selected_term_id: int
    game_state: GameStateResponse
