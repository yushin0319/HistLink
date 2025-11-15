"""Pydantic schemas for API requests and responses"""
from .term import TermResponse
from .route import RouteResponse, RouteListResponse
from .game import (
    GameStartRequest,
    GameStartResponse,
    GameStateResponse,
    ChoiceResponse,
    ChoicesResponse,
    AnswerRequest,
    AnswerResponse,
)

__all__ = [
    "TermResponse",
    "RouteResponse",
    "RouteListResponse",
    "GameStartRequest",
    "GameStartResponse",
    "GameStateResponse",
    "ChoiceResponse",
    "ChoicesResponse",
    "AnswerRequest",
    "AnswerResponse",
]
