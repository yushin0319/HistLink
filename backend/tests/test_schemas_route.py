"""Term/Route schema validation tests"""
from datetime import datetime
from uuid import uuid4

from app.schemas.game import (
    ChoiceResponse,
    FullRouteStartResponse,
    RouteStepWithChoices,
)
from app.schemas.term import TermResponse


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
