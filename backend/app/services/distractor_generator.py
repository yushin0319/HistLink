"""
ダミー生成ロジック（キャッシュ版）

難易度別のデータ範囲:
- Easy: Tier1のみ + easyエッジのみ
- Normal: Tier1-2 + easy/normalエッジ
- Hard: 全Tier + 全エッジ

誤答条件: 正解と2hop以上離れている（直接繋がっていない）
"""

from typing import List, Optional, Set
import random

from app.services.cache import get_cache


def generate_distractors(
    correct_id: int,
    current_id: int,
    visited: Set[int],
    difficulty: str,
    count: int,
    seed: Optional[int] = None
) -> List[int]:
    """
    ダミー候補を生成（キャッシュ版）

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
        seed: 乱数シード（決定性のため）

    Returns:
        ダミー用語IDのリスト
    """
    rng = random.Random(seed)

    # 難易度に応じたTier範囲を決定
    if difficulty == 'easy':
        max_tier = 1
    elif difficulty == 'normal':
        max_tier = 2
    else:  # hard
        max_tier = 3

    cache = get_cache()

    # 該当Tier範囲の全用語を取得
    all_candidates = cache.get_terms_by_max_tier(max_tier)

    # 正解の隣接ノード（1hop）を取得
    correct_neighbors = cache.get_neighbors(correct_id)

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
        return rng.sample(candidates, count)
