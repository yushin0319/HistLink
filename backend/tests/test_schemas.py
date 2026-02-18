"""Schema validation tests"""
import pytest
from uuid import uuid4
from datetime import datetime
from pydantic import ValidationError

from app.schemas.game import (
    GameStartRequest,
    ChoiceResponse,
    GameResultRequest,
    RankingEntry,
    GameResultResponse,
    GameUpdateRequest,
    OverallRankingResponse,
    RouteStepWithChoices,
    FullRouteStartResponse,
)
from app.schemas.term import TermResponse


class TestGameStartRequest:
    """GameStartRequest validation tests"""

    def test_default_values(self):
        """Test default values"""
        request = GameStartRequest()
        assert request.difficulty == "normal"
        assert request.target_length == 20

    def test_valid_difficulties(self):
        """Test all valid difficulty values"""
        for difficulty in ["easy", "normal", "hard"]:
            request = GameStartRequest(difficulty=difficulty)
            assert request.difficulty == difficulty

    def test_invalid_difficulty(self):
        """Test invalid difficulty value"""
        with pytest.raises(ValidationError) as exc_info:
            GameStartRequest(difficulty="impossible")
        assert "difficulty" in str(exc_info.value)

    def test_target_length_min(self):
        """Test target_length minimum value (5)"""
        request = GameStartRequest(target_length=5)
        assert request.target_length == 5

    def test_target_length_max(self):
        """Test target_length maximum value (50)"""
        request = GameStartRequest(target_length=50)
        assert request.target_length == 50

    def test_target_length_below_min(self):
        """Test target_length below minimum"""
        with pytest.raises(ValidationError) as exc_info:
            GameStartRequest(target_length=4)
        assert "target_length" in str(exc_info.value)

    def test_target_length_above_max(self):
        """Test target_length above maximum"""
        with pytest.raises(ValidationError) as exc_info:
            GameStartRequest(target_length=51)
        assert "target_length" in str(exc_info.value)


class TestChoiceResponse:
    """ChoiceResponse validation tests"""

    def test_valid_choice(self):
        """Test valid choice response"""
        choice = ChoiceResponse(term_id=1, name="農耕", tier=1)
        assert choice.term_id == 1
        assert choice.name == "農耕"
        assert choice.tier == 1

    def test_from_attributes_config(self):
        """Test from_attributes config is set"""
        assert ChoiceResponse.model_config.get("from_attributes") is True


class TestGameResultRequest:
    """GameResultRequest validation tests"""

    def test_default_values(self):
        """Test default values"""
        request = GameResultRequest(
            base_score=100,
            final_lives=3,
            cleared_steps=10,
        )
        assert request.user_name == "GUEST"
        assert request.false_steps == []

    def test_valid_request(self):
        """Test valid request with all fields"""
        request = GameResultRequest(
            base_score=500,
            final_lives=2,
            cleared_steps=15,
            user_name="Player1",
            false_steps=[2, 5, 8],
        )
        assert request.base_score == 500
        assert request.final_lives == 2
        assert request.cleared_steps == 15
        assert request.user_name == "Player1"
        assert request.false_steps == [2, 5, 8]

    def test_negative_score(self):
        """Test negative score is invalid"""
        with pytest.raises(ValidationError) as exc_info:
            GameResultRequest(
                base_score=-1,
                final_lives=3,
                cleared_steps=10,
            )
        assert "base_score" in str(exc_info.value)

    def test_negative_lives(self):
        """Test negative lives is invalid"""
        with pytest.raises(ValidationError) as exc_info:
            GameResultRequest(
                base_score=100,
                final_lives=-1,
                cleared_steps=10,
            )
        assert "final_lives" in str(exc_info.value)

    def test_negative_cleared_steps(self):
        """Test negative cleared_steps is invalid"""
        with pytest.raises(ValidationError) as exc_info:
            GameResultRequest(
                base_score=100,
                final_lives=3,
                cleared_steps=-1,
            )
        assert "cleared_steps" in str(exc_info.value)

    def test_user_name_max_length(self):
        """Test user_name max length (20)"""
        request = GameResultRequest(
            base_score=100,
            final_lives=3,
            cleared_steps=10,
            user_name="A" * 20,
        )
        assert len(request.user_name) == 20

    def test_user_name_exceeds_max_length(self):
        """Test user_name exceeds max length"""
        with pytest.raises(ValidationError) as exc_info:
            GameResultRequest(
                base_score=100,
                final_lives=3,
                cleared_steps=10,
                user_name="A" * 21,
            )
        assert "user_name" in str(exc_info.value)


class TestRankingEntry:
    """RankingEntry validation tests"""

    def test_valid_entry(self):
        """Test valid ranking entry"""
        entry = RankingEntry(
            rank=1,
            user_name="Champion",
            score=1000,
            cleared_steps=20,
        )
        assert entry.rank == 1
        assert entry.user_name == "Champion"
        assert entry.score == 1000
        assert entry.cleared_steps == 20


class TestGameResultResponse:
    """GameResultResponse validation tests"""

    def test_valid_response(self):
        """Test valid game result response"""
        game_id = uuid4()
        response = GameResultResponse(
            game_id=game_id,
            difficulty="normal",
            total_steps=20,
            final_score=500,
            final_lives=2,
            cleared_steps=15,
            user_name="Player1",
            my_rank=5,
            rankings=[
                RankingEntry(rank=1, user_name="Top", score=1000, cleared_steps=20),
            ],
        )
        assert response.game_id == game_id
        assert response.difficulty == "normal"
        assert response.my_rank == 5


class TestGameUpdateRequest:
    """GameUpdateRequest validation tests"""

    def test_valid_request(self):
        """Test valid update request"""
        request = GameUpdateRequest(user_name="NewName")
        assert request.user_name == "NewName"

    def test_user_name_exceeds_max_length(self):
        """Test user_name exceeds max length"""
        with pytest.raises(ValidationError) as exc_info:
            GameUpdateRequest(user_name="A" * 21)
        assert "user_name" in str(exc_info.value)


class TestOverallRankingResponse:
    """OverallRankingResponse validation tests"""

    def test_valid_response(self):
        """Test valid overall ranking response"""
        response = OverallRankingResponse(
            my_rank=10,
            rankings=[
                RankingEntry(rank=1, user_name="First", score=1000, cleared_steps=20),
                RankingEntry(rank=2, user_name="Second", score=900, cleared_steps=18),
            ],
        )
        assert response.my_rank == 10
        assert len(response.rankings) == 2


class TestTermResponse:
    """TermResponse validation tests"""

    def test_valid_term(self):
        """Test valid term response"""
        term = TermResponse(
            id=1,
            name="農耕",
            tier=1,
            category="技術",
            description="農作物を栽培する技術",
        )
        assert term.id == 1
        assert term.name == "農耕"
        assert term.tier == 1
        assert term.category == "技術"
        assert term.description == "農作物を栽培する技術"

    def test_from_attributes_config(self):
        """Test from_attributes config is set"""
        assert TermResponse.model_config.get("from_attributes") is True


class TestRouteStepWithChoices:
    """RouteStepWithChoices validation tests"""

    def test_valid_step(self):
        """Test valid route step"""
        step = RouteStepWithChoices(
            step_no=1,
            term=TermResponse(
                id=1,
                name="農耕",
                tier=1,
                category="技術",
                description="農作物を栽培する技術",
            ),
            correct_next_id=2,
            choices=[
                ChoiceResponse(term_id=2, name="鉄器", tier=1),
                ChoiceResponse(term_id=3, name="青銅器", tier=1),
                ChoiceResponse(term_id=4, name="石器", tier=1),
                ChoiceResponse(term_id=5, name="土器", tier=1),
            ],
            difficulty="easy",
            keyword="農耕開始",
            edge_description="農耕が始まった",
        )
        assert step.step_no == 1
        assert step.correct_next_id == 2
        assert len(step.choices) == 4

    def test_last_step_no_next(self):
        """Test last step has no correct_next_id"""
        step = RouteStepWithChoices(
            step_no=20,
            term=TermResponse(
                id=20,
                name="終点",
                tier=1,
                category="技術",
                description="終点の説明",
            ),
            correct_next_id=None,
            choices=[],
            difficulty="easy",
            keyword="終了",
            edge_description="ルート終了",
        )
        assert step.correct_next_id is None


class TestFullRouteStartResponse:
    """FullRouteStartResponse validation tests"""

    def test_valid_response(self):
        """Test valid full route start response"""
        game_id = uuid4()
        now = datetime.now()
        response = FullRouteStartResponse(
            game_id=game_id,
            difficulty="normal",
            total_steps=2,
            steps=[
                RouteStepWithChoices(
                    step_no=0,
                    term=TermResponse(
                        id=1,
                        name="農耕",
                        tier=1,
                        category="技術",
                        description="農作物を栽培する技術",
                    ),
                    correct_next_id=2,
                    choices=[
                        ChoiceResponse(term_id=2, name="鉄器", tier=1),
                    ],
                    difficulty="easy",
                    keyword="開始",
                    edge_description="開始説明",
                ),
            ],
            created_at=now,
        )
        assert response.game_id == game_id
        assert response.difficulty == "normal"
        assert response.total_steps == 2
        assert len(response.steps) == 1
        assert response.created_at == now
