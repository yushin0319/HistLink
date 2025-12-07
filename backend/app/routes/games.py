"""ゲーム関連のAPIエンドポイント（キャッシュ版）"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID, uuid4
from datetime import datetime

from app.database import get_db
from app.schemas import (
    GameStartRequest,
    TermResponse,
    ChoiceResponse,
    GameResultRequest,
    GameResultResponse,
    RouteStepWithChoices,
    FullRouteStartResponse,
)
from app.services.route_generator import generate_route
from app.services.distractor_generator import generate_distractors
from app.services.cache import get_cache
import random

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/start", response_model=FullRouteStartResponse)
async def start_game(
    request: GameStartRequest,
    db: Session = Depends(get_db)
):
    """
    新しいゲームを開始（キャッシュ版）

    全ルート+全選択肢を一括返却し、ゲームロジックはフロントエンドで実行。
    ゲーム終了後に /games/{game_id}/result で結果を送信する。

    難易度別のデータ範囲:
    - easy: Tier1のみ + easyエッジのみ
    - normal: Tier1-2 + easy/normalエッジ
    - hard: 全Tier + 全エッジ

    Args:
        request: ゲーム開始リクエスト（difficulty, target_length）
        db: データベースセッション（結果保存用）

    Returns:
        FullRouteStartResponse: 全ステップ+選択肢を含むゲーム開始レスポンス

    Raises:
        HTTPException: スタート地点が見つからない場合（400）
    """
    cache = get_cache()

    # ルートを生成（キャッシュから、DBアクセスなし）
    # target_length回のゲーム = target_length+1ノード（target_lengthエッジ）が必要
    try:
        route = generate_route(
            target_length=request.target_length + 1,
            difficulty=request.difficulty,
            max_start_retries=20,
            max_same_start_retries=50
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not route:
        raise HTTPException(status_code=400, detail="Failed to generate route")

    # ゲームIDを生成
    game_id = uuid4()
    created_at = datetime.utcnow()

    # gamesテーブルに保存（新設計: route_id不要、terms配列を保存）
    db.execute(
        text("""
            INSERT INTO games (id, difficulty, terms, cleared_steps, score, lives, created_at, updated_at)
            VALUES (:id, :difficulty, :terms, 0, 0, 3, :created_at, :created_at)
        """),
        {
            "id": str(game_id),
            "difficulty": request.difficulty,
            "terms": route,
            "created_at": created_at
        }
    )
    db.commit()

    # 全ステップ+選択肢を作成（キャッシュから）
    steps: list[RouteStepWithChoices] = []
    visited = set()

    for step_no, term_id in enumerate(route):
        # 用語情報をキャッシュから取得
        term_data = cache.get_term(term_id)
        if not term_data:
            raise HTTPException(status_code=500, detail=f"Term {term_id} not found in cache")

        term = TermResponse(
            id=term_data.id,
            name=term_data.name,
            tier=term_data.tier,
            category=term_data.category,
            description=term_data.description
        )

        # 最後のステップ以外は選択肢を生成
        if step_no < len(route) - 1:
            correct_next_id = route[step_no + 1]
            visited.add(term_id)

            # エッジ情報をキャッシュから取得
            edge = cache.get_edge(term_id, correct_next_id)

            if not edge:
                print(f"[WARNING] No edge found for term_a={min(term_id, correct_next_id)}, term_b={max(term_id, correct_next_id)}")
                difficulty_value = "normal"
                keyword = ""
                edge_description = ""
            else:
                difficulty_value = edge.difficulty or "normal"
                keyword = edge.keyword or ""
                edge_description = edge.description or ""

            # ダミーを3つ生成（キャッシュから）
            distractors = generate_distractors(
                correct_id=correct_next_id,
                current_id=term_id,
                visited=visited,
                difficulty=request.difficulty,
                count=3
            )

            # 4択を作成
            all_choice_ids = [correct_next_id] + distractors

            # 選択肢の詳細をキャッシュから取得
            choices = []
            for choice_id in all_choice_ids:
                choice_term = cache.get_term(choice_id)
                if choice_term:
                    choices.append(
                        ChoiceResponse(
                            term_id=choice_term.id,
                            name=choice_term.name,
                            tier=choice_term.tier
                        )
                    )

            # シャッフル
            random.shuffle(choices)

            steps.append(RouteStepWithChoices(
                step_no=step_no,
                term=term,
                correct_next_id=correct_next_id,
                choices=choices,
                difficulty=difficulty_value,
                keyword=keyword,
                edge_description=edge_description
            ))
        else:
            # 最後のステップは選択肢なし
            steps.append(RouteStepWithChoices(
                step_no=step_no,
                term=term,
                correct_next_id=None,
                choices=[],
                difficulty="",
                keyword="",
                edge_description=""
            ))

    return FullRouteStartResponse(
        game_id=game_id,
        route_id=0,  # route_idは廃止予定、互換性のため0を返す
        difficulty=request.difficulty,
        total_steps=len(route),
        steps=steps,
        created_at=created_at
    )


@router.post("/{game_id}/result", response_model=GameResultResponse)
async def submit_game_result(
    game_id: UUID,
    request: GameResultRequest,
    db: Session = Depends(get_db)
):
    """
    ゲーム結果を送信（フロントエンド主体設計）

    フロントエンドで全てのゲームロジックを実行した後、
    最終スコア・残りライフ・クリア状況をバックエンドに送信してDBを更新する。
    """
    # ゲームが存在するか確認
    game_result = db.execute(
        text("SELECT id FROM games WHERE id = :game_id"),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail="Game not found")

    # ゲーム結果をDBに保存
    db.execute(
        text("""
            UPDATE games
            SET score = :score,
                lives = :lives,
                cleared_steps = :cleared_steps,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :game_id
        """),
        {
            "game_id": str(game_id),
            "score": request.final_score,
            "lives": request.final_lives,
            "cleared_steps": request.cleared_steps
        }
    )
    db.commit()

    # 成功メッセージを生成
    if request.final_lives > 0:
        message = f"ゲームクリア！最終スコア: {request.final_score}点"
    else:
        message = f"ゲームオーバー。最終スコア: {request.final_score}点"

    return GameResultResponse(
        game_id=game_id,
        final_score=request.final_score,
        final_lives=request.final_lives,
        cleared_steps=request.cleared_steps,
        message=message
    )
