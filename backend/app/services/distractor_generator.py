"""
ダミー生成ロジック（新仕様）

難易度別のデータ範囲:
- Easy: Tier1のみ + easyエッジのみ
- Normal: Tier1-2 + easy/normalエッジ
- Hard: 全Tier + 全エッジ

誤答条件: 正解と2hop以上離れている（直接繋がっていない）
"""

from typing import List, Optional, Set
import random
from sqlalchemy import text


def get_neighbors_for_term(term_id: int, db) -> Set[int]:
    """
    指定用語の隣接ノード（1hop）を取得

    Args:
        term_id: 用語ID
        db: データベース接続

    Returns:
        隣接ノードIDのセット
    """
    result = db.execute(
        text("""
        SELECT target FROM relations WHERE source = :term_id
        UNION
        SELECT source FROM relations WHERE target = :term_id
        """),
        {"term_id": term_id}
    )

    return {row[0] for row in result}


def get_terms_by_tier(max_tier: int, db) -> List[int]:
    """
    指定Tier以下の全用語IDを取得

    Args:
        max_tier: 最大Tier (1, 2, or 3)
        db: データベース接続

    Returns:
        用語IDのリスト
    """
    result = db.execute(
        text("SELECT id FROM terms WHERE tier <= :max_tier"),
        {"max_tier": max_tier}
    )

    return [row[0] for row in result]


def generate_distractors(
    correct_id: int,
    current_id: int,
    visited: Set[int],
    difficulty: str,
    count: int,
    db,
    seed: Optional[int] = None
) -> List[int]:
    """
    ダミー候補を生成（新仕様）

    難易度別のデータ範囲:
    - Easy: Tier1のみ
    - Normal: Tier1-2
    - Hard: 全Tier

    誤答条件: 正解と2hop以上離れている

    Args:
        correct_id: 正解の用語ID
        current_id: 現在の用語ID（未使用だが互換性のため残す）
        visited: 訪問済み用語のセット
        difficulty: 難易度 ('easy', 'normal', 'hard')
        count: 生成するダミー数
        db: データベース接続
        seed: 乱数シード（決定性のため）

    Returns:
        ダミー用語IDのリスト
    """
    if seed is not None:
        random.seed(seed)

    # 難易度に応じたTier範囲を決定
    if difficulty == 'easy':
        max_tier = 1
    elif difficulty == 'normal':
        max_tier = 2
    else:  # hard
        max_tier = 3

    # 該当Tier範囲の全用語を取得
    all_candidates = get_terms_by_tier(max_tier, db)

    # 正解の隣接ノード（1hop）を取得
    correct_neighbors = get_neighbors_for_term(correct_id, db)

    # フィルタリング
    candidates = []
    for term_id in all_candidates:
        # 正解自体を除外
        if term_id == correct_id:
            continue

        # 訪問済みを除外
        if term_id in visited:
            continue

        # 1hop（直接繋がっている）を除外 → 2hop以上のみ残る
        if term_id in correct_neighbors:
            continue

        candidates.append(term_id)

    # ランダムにcount個選択
    if len(candidates) <= count:
        return candidates
    else:
        return random.sample(candidates, count)
