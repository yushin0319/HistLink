"""ゲーム関連のAPIエンドポイント"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID

from app.database import get_db
from app.schemas import GameStartRequest, GameStartResponse, GameStateResponse, TermResponse, ChoicesResponse, ChoiceResponse, AnswerRequest, AnswerResponse
from app.services.route_generator import select_random_start, generate_route
from app.services.distractor_generator import generate_distractors
import random

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/start", response_model=GameStartResponse)
async def start_game(
    request: GameStartRequest,
    db: Session = Depends(get_db)
):
    """
    新しいゲームを開始

    Args:
        request: ゲーム開始リクエスト（difficulty, era, target_length）
        db: データベースセッション

    Returns:
        GameStartResponse: ゲーム開始レスポンス（game_id, 初期状態）

    Raises:
        HTTPException: スタート地点が見つからない場合（400）
    """
    # ランダムスタート地点を選択
    try:
        start_term_id = select_random_start(db, era=request.era)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ルートを生成
    route = generate_route(
        start_term_id=start_term_id,
        target_length=request.target_length,
        db=db
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
            RETURNING id, route_id, current_step, lives, score, chain_count, is_finished, created_at, updated_at
        """),
        {"route_id": route_id}
    )
    game_row = game_result.fetchone()
    db.commit()

    # current_termを取得
    current_term_result = db.execute(
        text("""
            SELECT id, name, era, tags
            FROM terms
            WHERE id = :term_id
        """),
        {"term_id": start_term_id}
    )
    term_row = current_term_result.fetchone()

    current_term = TermResponse(
        id=term_row[0],
        name=term_row[1],
        era=term_row[2],
        tags=term_row[3]
    )

    # レスポンスを作成
    return GameStartResponse(
        game_id=game_row[0],
        route_id=game_row[1],
        current_step=game_row[2],
        current_term=current_term,
        lives=game_row[3],
        score=game_row[4],
        chain_count=game_row[5],
        is_finished=game_row[6],
        created_at=game_row[7],
        updated_at=game_row[8]
    )


@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game_state(
    game_id: UUID,
    db: Session = Depends(get_db)
):
    """
    ゲーム状態を取得

    Args:
        game_id: ゲームID（UUID）
        db: データベースセッション

    Returns:
        GameStateResponse: ゲーム状態

    Raises:
        HTTPException: ゲームが見つからない場合（404）
    """
    # ゲーム状態を取得
    game_result = db.execute(
        text("""
            SELECT id, route_id, current_step, lives, score, chain_count, is_finished, created_at, updated_at
            FROM games
            WHERE id = :game_id
        """),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    # current_stepに対応するterm_idを取得
    term_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no = :step_no
        """),
        {"route_id": game_row[1], "step_no": game_row[2]}
    )
    term_id_row = term_result.fetchone()

    if not term_id_row:
        raise HTTPException(status_code=500, detail="Route step not found")

    # current_termを取得
    current_term_result = db.execute(
        text("""
            SELECT id, name, era, tags
            FROM terms
            WHERE id = :term_id
        """),
        {"term_id": term_id_row[0]}
    )
    term_row = current_term_result.fetchone()

    current_term = TermResponse(
        id=term_row[0],
        name=term_row[1],
        era=term_row[2],
        tags=term_row[3]
    )

    return GameStateResponse(
        game_id=game_row[0],
        route_id=game_row[1],
        current_step=game_row[2],
        current_term=current_term,
        lives=game_row[3],
        score=game_row[4],
        chain_count=game_row[5],
        is_finished=game_row[6],
        created_at=game_row[7],
        updated_at=game_row[8]
    )


@router.get("/{game_id}/choices", response_model=ChoicesResponse)
async def get_choices(
    game_id: UUID,
    db: Session = Depends(get_db)
):
    """
    4択選択肢を取得

    Args:
        game_id: ゲームID（UUID）
        db: データベースセッション

    Returns:
        ChoicesResponse: 4択選択肢（正解1 + ダミー3）

    Raises:
        HTTPException: ゲームが見つからない、または終了済みの場合
    """
    # ゲーム状態を取得
    game_result = db.execute(
        text("""
            SELECT id, route_id, current_step, is_finished
            FROM games
            WHERE id = :game_id
        """),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    if game_row[3]:  # is_finished
        raise HTTPException(status_code=400, detail="Game is already finished")

    route_id = game_row[1]
    current_step = game_row[2]

    # 現在のcurrent_termを取得
    current_term_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no = :step_no
        """),
        {"route_id": route_id, "step_no": current_step}
    )
    current_term_id = current_term_result.fetchone()[0]

    # 次のステップ（正解）を取得
    next_term_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no = :step_no
        """),
        {"route_id": route_id, "step_no": current_step + 1}
    )
    next_term_row = next_term_result.fetchone()

    if not next_term_row:
        raise HTTPException(status_code=400, detail="No more steps in route")

    correct_term_id = next_term_row[0]

    # 訪問済みノードを取得（current_stepまで）
    visited_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no <= :step_no
            ORDER BY step_no
        """),
        {"route_id": route_id, "step_no": current_step}
    )
    visited = {row[0] for row in visited_result}

    # ダミーを3つ生成
    distractors = generate_distractors(
        correct_id=correct_term_id,
        current_id=current_term_id,
        visited=visited,
        difficulty="standard",
        count=3,
        db=db
    )

    # 4択を作成
    all_choice_ids = [correct_term_id] + distractors

    # 選択肢の詳細を取得
    choices = []
    for choice_id in all_choice_ids:
        term_result = db.execute(
            text("""
                SELECT id, name, era
                FROM terms
                WHERE id = :term_id
            """),
            {"term_id": choice_id}
        )
        term_row = term_result.fetchone()
        choices.append(
            ChoiceResponse(
                term_id=term_row[0],
                name=term_row[1],
                era=term_row[2]
            )
        )

    # シャッフル
    random.shuffle(choices)

    # current_term詳細を取得
    current_term_full = db.execute(
        text("""
            SELECT id, name, era, tags
            FROM terms
            WHERE id = :term_id
        """),
        {"term_id": current_term_id}
    ).fetchone()

    current_term = TermResponse(
        id=current_term_full[0],
        name=current_term_full[1],
        era=current_term_full[2],
        tags=current_term_full[3]
    )

    return ChoicesResponse(
        game_id=game_id,
        current_step=current_step,
        current_term=current_term,
        choices=choices
    )


@router.post("/{game_id}/answer", response_model=AnswerResponse)
async def post_answer(
    game_id: UUID,
    request: AnswerRequest,
    db: Session = Depends(get_db)
):
    """
    回答を判定してゲーム状態を更新

    Args:
        game_id: ゲームID（UUID）
        request: 回答リクエスト（selected_term_id）
        db: データベースセッション

    Returns:
        AnswerResponse: 正誤判定と更新後のゲーム状態

    Raises:
        HTTPException: ゲームが見つからない、または終了済みの場合
    """
    # ゲーム状態を取得
    game_result = db.execute(
        text("""
            SELECT id, route_id, current_step, lives, score, chain_count, is_finished
            FROM games
            WHERE id = :game_id
        """),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    if game_row[6]:  # is_finished
        raise HTTPException(status_code=400, detail="Game is already finished")

    route_id = game_row[1]
    current_step = game_row[2]
    lives = game_row[3]
    score = game_row[4]
    chain_count = game_row[5]

    # 正解を取得（次のステップ）
    correct_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no = :step_no
        """),
        {"route_id": route_id, "step_no": current_step + 1}
    )
    correct_row = correct_result.fetchone()

    if not correct_row:
        raise HTTPException(status_code=400, detail="No more steps in route")

    correct_term_id = correct_row[0]
    selected_term_id = request.selected_term_id
    is_correct = (selected_term_id == correct_term_id)

    # ゲーム状態を更新
    if is_correct:
        # 正解：ステップ進行、チェーン増加、スコア加算
        current_step += 1
        chain_count += 1
        # スコア計算：基本点100 + チェーンボーナス（チェーン数 × 10）
        score += 100 + (chain_count * 10)

        # ルート完了チェック
        route_length_result = db.execute(
            text("SELECT length FROM routes WHERE id = :route_id"),
            {"route_id": route_id}
        )
        route_length = route_length_result.fetchone()[0]
        is_finished = (current_step >= route_length - 1)
    else:
        # 不正解：ライフ減少、チェーンリセット
        lives -= 1
        chain_count = 0
        # ゲームオーバーチェック
        is_finished = (lives <= 0)

    # データベース更新
    db.execute(
        text("""
            UPDATE games
            SET current_step = :current_step,
                lives = :lives,
                score = :score,
                chain_count = :chain_count,
                is_finished = :is_finished
            WHERE id = :game_id
        """),
        {
            "game_id": str(game_id),
            "current_step": current_step,
            "lives": lives,
            "score": score,
            "chain_count": chain_count,
            "is_finished": is_finished
        }
    )
    db.commit()

    # 更新後のcurrent_termを取得
    current_term_result = db.execute(
        text("""
            SELECT term_id
            FROM route_steps
            WHERE route_id = :route_id AND step_no = :step_no
        """),
        {"route_id": route_id, "step_no": current_step}
    )
    current_term_id = current_term_result.fetchone()[0]

    current_term_full = db.execute(
        text("""
            SELECT id, name, era, tags
            FROM terms
            WHERE id = :term_id
        """),
        {"term_id": current_term_id}
    ).fetchone()

    current_term = TermResponse(
        id=current_term_full[0],
        name=current_term_full[1],
        era=current_term_full[2],
        tags=current_term_full[3]
    )

    # 更新後のゲーム状態を取得
    updated_game_result = db.execute(
        text("""
            SELECT id, route_id, current_step, lives, score, chain_count, is_finished, created_at, updated_at
            FROM games
            WHERE id = :game_id
        """),
        {"game_id": str(game_id)}
    )
    updated_game_row = updated_game_result.fetchone()

    game_state = GameStateResponse(
        game_id=updated_game_row[0],
        route_id=updated_game_row[1],
        current_step=updated_game_row[2],
        current_term=current_term,
        lives=updated_game_row[3],
        score=updated_game_row[4],
        chain_count=updated_game_row[5],
        is_finished=updated_game_row[6],
        created_at=updated_game_row[7],
        updated_at=updated_game_row[8]
    )

    return AnswerResponse(
        is_correct=is_correct,
        correct_term_id=correct_term_id,
        selected_term_id=selected_term_id,
        game_state=game_state
    )
