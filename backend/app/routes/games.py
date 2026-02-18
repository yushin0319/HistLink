"""ゲーム関連のAPIエンドポイント（キャッシュ版）"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database import get_db
from app.schemas import (
    GameStartRequest,
    TermResponse,
    ChoiceResponse,
    GameResultRequest,
    GameResultResponse,
    GameUpdateRequest,
    OverallRankingResponse,
    RankingEntry,
    RouteStepWithChoices,
    FullRouteStartResponse,
)
from app.services.route_generator import generate_route
from app.services.distractor_generator import generate_distractors
from app.services.cache import get_cache
import random

router = APIRouter(prefix="/games", tags=["games"])

RANKING_LIMIT = 10  # 上位何件を返すか
LIFE_BONUS = {"easy": 100, "normal": 200, "hard": 300}


def get_rankings_and_my_rank(
    db: Session,
    total_steps: int,
    my_score: int,
    limit: int = RANKING_LIMIT
) -> tuple[list[RankingEntry], int]:
    """
    指定問題数のランキングと自分の順位を取得

    Args:
        db: DBセッション
        total_steps: 問題数（10, 30, 50など）
        my_score: 自分のスコア
        limit: 取得する上位件数

    Returns:
        (ランキングリスト, 自分の順位)
    """
    # 上位ランキングを取得（問題数でフィルタリング）
    # total_steps = array_length(terms, 1) - 1
    ranking_result = db.execute(
        text("""
            SELECT user_name, score, cleared_steps
            FROM games
            WHERE array_length(terms, 1) - 1 = :total_steps
            ORDER BY score DESC, created_at DESC
            LIMIT :limit
        """),
        {"total_steps": total_steps, "limit": limit}
    )
    ranking_rows = ranking_result.fetchall()

    rankings = [
        RankingEntry(
            rank=i + 1,
            user_name=row.user_name,
            score=row.score,
            cleared_steps=row.cleared_steps
        )
        for i, row in enumerate(ranking_rows)
    ]

    # 自分の順位を取得（自分より高いスコアの数 + 1）
    rank_result = db.execute(
        text("""
            SELECT COUNT(*) + 1 as rank
            FROM games
            WHERE array_length(terms, 1) - 1 = :total_steps AND score > :my_score
        """),
        {"total_steps": total_steps, "my_score": my_score}
    )
    my_rank = rank_result.fetchone().rank

    return rankings, my_rank


def get_overall_rankings_and_my_rank(
    db: Session,
    my_score: int,
    limit: int = RANKING_LIMIT
) -> tuple[list[RankingEntry], int]:
    """
    全体ランキングと自分の順位を取得（難易度関係なし）

    Args:
        db: DBセッション
        my_score: 自分のスコア
        limit: 取得する上位件数

    Returns:
        (ランキングリスト, 自分の順位)
    """
    # 上位ランキングを取得（全難易度）
    ranking_result = db.execute(
        text("""
            SELECT user_name, score, cleared_steps
            FROM games
            ORDER BY score DESC, created_at DESC
            LIMIT :limit
        """),
        {"limit": limit}
    )
    ranking_rows = ranking_result.fetchall()

    rankings = [
        RankingEntry(
            rank=i + 1,
            user_name=row.user_name,
            score=row.score,
            cleared_steps=row.cleared_steps
        )
        for i, row in enumerate(ranking_rows)
    ]

    # 自分の順位を取得（自分より高いスコアの数 + 1）
    rank_result = db.execute(
        text("""
            SELECT COUNT(*) + 1 as rank
            FROM games
            WHERE score > :my_score
        """),
        {"my_score": my_score}
    )
    my_rank = rank_result.fetchone().rank

    return rankings, my_rank


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
    created_at = datetime.now(timezone.utc)

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
    ゲーム結果を送信

    フロントエンドからタイマーベースの素点（base_score）と結果データを受け取り、
    ライフボーナスの計算はサーバー側で行ってDBに保存する。
    """
    # ゲームが存在するか確認し、難易度とルート情報を取得
    game_result = db.execute(
        text("SELECT id, difficulty, terms FROM games WHERE id = :game_id"),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail="Game not found")

    difficulty = game_row.difficulty

    # --- サーバーサイド検証 ---
    total_steps = len(game_row.terms) - 1 if game_row.terms else 0

    # cleared_steps は 0 〜 total_steps の範囲
    if not (0 <= request.cleared_steps <= total_steps):
        raise HTTPException(status_code=400, detail="Invalid cleared_steps")

    # final_lives は 0 〜 3 の範囲（初期ライフ3）
    if not (0 <= request.final_lives <= 3):
        raise HTTPException(status_code=400, detail="Invalid final_lives")

    # cleared_steps + ミス回数 <= total_steps（答えた問題数が総問題数を超えない）
    false_steps = request.false_steps or []
    false_count = len(false_steps)
    if request.cleared_steps + false_count > total_steps:
        raise HTTPException(status_code=400, detail="Invalid step counts")

    # base_score は 0 以上、かつ妥当な上限
    # フロントエンドは1ステップあたり最大200点（残り時間=MAX_TIME=200）
    max_base_score = request.cleared_steps * 200
    if not (0 <= request.base_score <= max_base_score):
        raise HTTPException(status_code=400, detail="Invalid score")

    # サーバー側でライフボーナスを計算し、最終スコアを確定
    life_bonus = request.final_lives * LIFE_BONUS[difficulty]
    final_score = request.base_score + life_bonus

    # ゲーム結果をDBに保存
    db.execute(
        text("""
            UPDATE games
            SET score = :score,
                lives = :lives,
                cleared_steps = :cleared_steps,
                user_name = :user_name,
                false_steps = :false_steps,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :game_id
        """),
        {
            "game_id": str(game_id),
            "score": final_score,
            "lives": request.final_lives,
            "cleared_steps": request.cleared_steps,
            "user_name": request.user_name,
            "false_steps": false_steps
        }
    )
    db.commit()

    # ランキング情報を取得（問題数でフィルタリング）
    rankings, my_rank = get_rankings_and_my_rank(
        db, total_steps, final_score
    )

    return GameResultResponse(
        game_id=game_id,
        difficulty=difficulty,
        total_steps=total_steps,
        final_score=final_score,
        final_lives=request.final_lives,
        cleared_steps=request.cleared_steps,
        user_name=request.user_name,
        my_rank=my_rank,
        rankings=rankings
    )


@router.patch("/{game_id}", response_model=GameResultResponse)
async def update_game(
    game_id: UUID,
    request: GameUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    ゲーム情報を更新（主にユーザー名変更用）

    リザルト画面で名前を変更した場合などに使用。
    """
    # ゲームが存在するか確認し、現在の状態を取得
    game_result = db.execute(
        text("""
            SELECT id, difficulty, terms, score, lives, cleared_steps, user_name
            FROM games WHERE id = :game_id
        """),
        {"game_id": str(game_id)}
    )
    game_row = game_result.fetchone()

    if not game_row:
        raise HTTPException(status_code=404, detail="Game not found")

    # ユーザー名を更新
    db.execute(
        text("""
            UPDATE games
            SET user_name = :user_name,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :game_id
        """),
        {
            "game_id": str(game_id),
            "user_name": request.user_name
        }
    )
    db.commit()

    # total_steps = エッジ数 = termsの長さ - 1
    total_steps = len(game_row.terms) - 1 if game_row.terms else 0

    # ランキング情報を取得（問題数でフィルタリング）
    rankings, my_rank = get_rankings_and_my_rank(
        db, total_steps, game_row.score
    )

    return GameResultResponse(
        game_id=game_id,
        difficulty=game_row.difficulty,
        total_steps=total_steps,
        final_score=game_row.score,
        final_lives=game_row.lives,
        cleared_steps=game_row.cleared_steps,
        user_name=request.user_name,
        my_rank=my_rank,
        rankings=rankings
    )


@router.get("/rankings/overall", response_model=OverallRankingResponse)
async def get_overall_ranking(
    my_score: int = 0,
    db: Session = Depends(get_db)
):
    """
    全体ランキングを取得（難易度問わず）

    Args:
        my_score: 自分のスコア（順位計算用）
        db: データベースセッション

    Returns:
        OverallRankingResponse: 全体ランキングと自分の順位
    """
    rankings, my_rank = get_overall_rankings_and_my_rank(db, my_score)

    return OverallRankingResponse(
        my_rank=my_rank,
        rankings=rankings
    )
