"""ゲーム関連のAPIエンドポイント"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID

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
from app.services.route_generator import select_random_start, generate_route
from app.services.distractor_generator import generate_distractors
import random

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/start", response_model=FullRouteStartResponse)
async def start_game(
    request: GameStartRequest,
    db: Session = Depends(get_db)
):
    """
    新しいゲームを開始（フロントエンド主体設計）

    全ルート+全選択肢を一括返却し、ゲームロジックはフロントエンドで実行。
    ゲーム終了後に /games/{game_id}/result で結果を送信する。

    難易度別のデータ範囲:
    - easy: Tier1のみ + easyエッジのみ
    - normal: Tier1-2 + easy/normalエッジ
    - hard: 全Tier + 全エッジ

    Args:
        request: ゲーム開始リクエスト（difficulty, target_length）
        db: データベースセッション

    Returns:
        FullRouteStartResponse: 全ステップ+選択肢を含むゲーム開始レスポンス

    Raises:
        HTTPException: スタート地点が見つからない場合（400）
    """
    # ランダムスタート地点を選択（難易度に応じたTierでフィルタ）
    try:
        start_term_id = select_random_start(db, difficulty=request.difficulty)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ルートを生成（難易度に応じたフィルタ付き）
    route = generate_route(
        start_term_id=start_term_id,
        target_length=request.target_length,
        db=db,
        difficulty=request.difficulty
    )

    # routesテーブルに保存
    route_result = db.execute(
        text("""
            INSERT INTO routes (start_term_id, length, difficulty)
            VALUES (:start_term_id, :length, :difficulty)
            RETURNING id
        """),
        {
            "start_term_id": start_term_id,
            "length": len(route),
            "difficulty": request.difficulty
        }
    )
    route_id = route_result.fetchone()[0]

    # route_stepsテーブルに保存
    for step_no, term_id in enumerate(route):
        db.execute(
            text("""
                INSERT INTO route_steps (route_id, step_no, term_id)
                VALUES (:route_id, :step_no, :term_id)
            """),
            {
                "route_id": route_id,
                "step_no": step_no,
                "term_id": term_id
            }
        )

    # gamesテーブルに保存
    game_result = db.execute(
        text("""
            INSERT INTO games (route_id, current_step, lives, score, chain_count, is_finished)
            VALUES (:route_id, 0, 3, 0, 0, false)
            RETURNING id, created_at
        """),
        {"route_id": route_id}
    )
    game_row = game_result.fetchone()
    db.commit()

    # 全ステップ+選択肢を作成
    steps: list[RouteStepWithChoices] = []
    visited = set()

    for step_no, term_id in enumerate(route):
        # 現在のステップの用語情報を取得
        term_result = db.execute(
            text("""
                SELECT id, name, tier, category, description
                FROM terms
                WHERE id = :term_id
            """),
            {"term_id": term_id}
        )
        term_row = term_result.fetchone()

        term = TermResponse(
            id=term_row[0],
            name=term_row[1],
            tier=term_row[2],
            category=term_row[3],
            description=term_row[4]
        )

        # 最後のステップ以外は選択肢を生成
        if step_no < len(route) - 1:
            correct_next_id = route[step_no + 1]
            visited.add(term_id)

            # リレーション情報を取得（双方向で検索）
            relation_result = db.execute(
                text("""
                    SELECT difficulty, keyword, explanation
                    FROM relations
                    WHERE (source = :source AND target = :target)
                       OR (source = :target AND target = :source)
                    LIMIT 1
                """),
                {"source": term_id, "target": correct_next_id}
            )
            relation_row = relation_result.fetchone()

            if not relation_row:
                print(f"[WARNING] No relation found for source={term_id}, target={correct_next_id}")
                edge_difficulty = "normal"
                keyword = ""
                explanation = ""
            else:
                edge_difficulty = relation_row[0] or "normal"
                keyword = relation_row[1] or ""
                explanation = relation_row[2] or ""
                print(f"[DEBUG] Relation found: source={term_id}, target={correct_next_id}, difficulty={edge_difficulty}, keyword={keyword}")

            # explanationのみを説明文として使用（keywordは別フィールドで返す）
            relation_description = explanation

            # ダミーを3つ生成（難易度に応じたTierフィルタ）
            distractors = generate_distractors(
                correct_id=correct_next_id,
                current_id=term_id,
                visited=visited,
                difficulty=request.difficulty,
                count=3,
                db=db
            )

            # 4択を作成
            all_choice_ids = [correct_next_id] + distractors

            # 選択肢の詳細を取得
            choices = []
            for choice_id in all_choice_ids:
                choice_result = db.execute(
                    text("""
                        SELECT id, name, tier
                        FROM terms
                        WHERE id = :term_id
                    """),
                    {"term_id": choice_id}
                )
                choice_row = choice_result.fetchone()
                choices.append(
                    ChoiceResponse(
                        term_id=choice_row[0],
                        name=choice_row[1],
                        tier=choice_row[2]
                    )
                )

            # シャッフル
            random.shuffle(choices)

            steps.append(RouteStepWithChoices(
                step_no=step_no,
                term=term,
                correct_next_id=correct_next_id,
                choices=choices,
                edge_difficulty=edge_difficulty,
                keyword=keyword,
                relation_description=relation_description
            ))
        else:
            # 最後のステップは選択肢なし
            steps.append(RouteStepWithChoices(
                step_no=step_no,
                term=term,
                correct_next_id=None,
                choices=[],
                edge_difficulty="",
                keyword="",
                relation_description=""
            ))

    return FullRouteStartResponse(
        game_id=game_row[0],
        route_id=route_id,
        difficulty=request.difficulty,
        total_steps=len(route),
        steps=steps,
        created_at=game_row[1]
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
                is_finished = :is_finished,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :game_id
        """),
        {
            "game_id": str(game_id),
            "score": request.final_score,
            "lives": request.final_lives,
            "is_finished": request.is_completed
        }
    )
    db.commit()

    # 成功メッセージを生成
    if request.is_completed:
        message = f"ゲームクリア！最終スコア: {request.final_score}点"
    else:
        message = f"ゲームオーバー。最終スコア: {request.final_score}点"

    return GameResultResponse(
        game_id=game_id,
        final_score=request.final_score,
        final_lives=request.final_lives,
        is_completed=request.is_completed,
        message=message
    )
