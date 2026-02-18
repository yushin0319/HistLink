"""ゲーム関連のスキーマ"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

from .term import TermResponse


class GameStartRequest(BaseModel):
    """ゲーム開始リクエスト"""
    difficulty: str = Field(default="normal", pattern="^(easy|normal|hard)$")
    target_length: int = Field(default=20, ge=5, le=50)


class ChoiceResponse(BaseModel):
    """選択肢レスポンス"""
    term_id: int
    name: str
    tier: int

    class Config:
        from_attributes = True


class GameResultRequest(BaseModel):
    """ゲーム結果送信リクエスト"""
    base_score: int = Field(ge=0)  # タイマーベースの素点（ライフボーナス含まない）
    final_lives: int = Field(ge=0)
    cleared_steps: int = Field(ge=0)
    user_name: str = Field(default="GUEST", max_length=20)
    false_steps: Optional[list[int]] = Field(default_factory=list)  # 間違えたステージのインデックス配列


class RankingEntry(BaseModel):
    """ランキングエントリ"""
    rank: int
    user_name: str
    score: int
    cleared_steps: int


class GameResultResponse(BaseModel):
    """ゲーム結果送信レスポンス（リザルト画面表示用）"""
    game_id: UUID
    difficulty: str
    total_steps: int  # ルートの総ステップ数（termsの長さ - 1）
    final_score: int
    final_lives: int
    cleared_steps: int
    user_name: str
    # ランキング情報
    my_rank: int  # 自分の順位
    rankings: list[RankingEntry]  # 上位ランキング


class GameUpdateRequest(BaseModel):
    """ゲーム更新リクエスト（名前変更用）"""
    user_name: str = Field(max_length=20)


class OverallRankingResponse(BaseModel):
    """全体ランキングレスポンス"""
    my_rank: int
    rankings: list[RankingEntry]


class RouteStepWithChoices(BaseModel):
    """ルートステップと選択肢のセット"""
    step_no: int
    term: TermResponse
    correct_next_id: int | None  # 次の正解（最後のステップではNone）
    choices: list[ChoiceResponse]  # 4択（正解1 + ダミー3）
    difficulty: str  # エッジの難易度（easy/normal/hard）
    keyword: str  # エッジのキーワード（例: "農耕開始"）
    edge_description: str  # エッジの説明文


class FullRouteStartResponse(BaseModel):
    """全ルート+全選択肢を含むゲーム開始レスポンス"""
    game_id: UUID
    difficulty: str
    total_steps: int
    steps: list[RouteStepWithChoices]
    created_at: datetime
