"""
ルート生成アルゴリズム（キャッシュ版）

ランダムウォーク方式：
- 行き止まり回避付きランダムウォーク
- キャッシュからデータ取得（DBアクセスなし）

難易度別のデータ範囲:
- Easy: Tier1のみ + easyエッジのみ
- Normal: Tier1-2 + easy/normalエッジ
- Hard: 全Tier + 全エッジ
"""

from typing import List, Optional, Set
import random

from app.services.cache import get_cache


def get_difficulty_filter(difficulty: str) -> tuple:
    """
    難易度に応じたTierとエッジの条件を取得

    Args:
        difficulty: 難易度 ('easy', 'normal', 'hard')

    Returns:
        (max_tier, allowed_difficulties) のタプル
    """
    if difficulty == 'easy':
        return (1, ['easy'])
    elif difficulty == 'normal':
        return (2, ['easy', 'normal'])
    else:  # hard
        return (3, ['easy', 'normal', 'hard'])


def get_unvisited_neighbors(
    term_id: int,
    visited: Set[int],
    max_tier: int = 3,
    allowed_difficulties: List[str] = None
) -> List[int]:
    """
    未訪問の隣接ノードを取得

    Args:
        term_id: 現在のノードID
        visited: 訪問済みノードのセット
        max_tier: 最大Tier (難易度フィルタ用)
        allowed_difficulties: 許可されるエッジ難易度リスト

    Returns:
        未訪問の隣接ノードIDリスト
    """
    if allowed_difficulties is None:
        allowed_difficulties = ['easy', 'normal', 'hard']

    cache = get_cache()
    neighbors = cache.get_neighbors_with_filter(
        term_id, max_tier, allowed_difficulties
    )

    return [n for n in neighbors if n not in visited]


def count_unvisited_neighbors(
    term_id: int,
    visited: Set[int],
    max_tier: int = 3,
    allowed_difficulties: List[str] = None
) -> int:
    """
    未訪問の隣接ノード数をカウント（残余次数）

    Args:
        term_id: ノードID
        visited: 訪問済みノードのセット
        max_tier: 最大Tier
        allowed_difficulties: 許可されるエッジ難易度リスト

    Returns:
        未訪問の隣接ノード数
    """
    neighbors = get_unvisited_neighbors(
        term_id, visited, max_tier, allowed_difficulties
    )
    return len(neighbors)


def select_random_start(
    difficulty: str = 'hard',
    seed: Optional[int] = None
) -> int:
    """
    ランダムにスタート地点を選ぶ

    Args:
        difficulty: 難易度 ('easy', 'normal', 'hard')
        seed: 乱数シード（オプション）

    Returns:
        ランダムに選ばれた用語ID
    """
    if seed is not None:
        random.seed(seed)

    max_tier, _ = get_difficulty_filter(difficulty)

    cache = get_cache()
    all_ids = cache.get_terms_by_max_tier(max_tier)

    if not all_ids:
        raise ValueError(f"No terms found with tier <= {max_tier}")

    return random.choice(all_ids)


def _random_walk(
    start_term_id: int,
    target_length: int,
    difficulty: str = 'hard'
) -> List[int]:
    """
    1回のランダムウォークでルート生成を試みる（内部用）

    行き止まり回避付きランダムウォークを使用。
    候補が複数あるとき、次の手で行き止まりにならない候補を優先する。

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長
        difficulty: 難易度 ('easy', 'normal', 'hard')

    Returns:
        用語IDのリスト（ルート）。目標長に届かない可能性あり。
    """
    max_tier, allowed_difficulties = get_difficulty_filter(difficulty)

    route = [start_term_id]
    visited = {start_term_id}

    while len(route) < target_length:
        current = route[-1]
        candidates = get_unvisited_neighbors(
            current, visited, max_tier, allowed_difficulties
        )

        # 候補がなければ終了（詰まった）
        if not candidates:
            break

        # 行き止まり回避: 次の手で行き止まりにならない候補を優先
        if len(candidates) > 1:
            non_dead = []
            for c in candidates:
                future_visited = visited | {c}
                future_neighbors = count_unvisited_neighbors(
                    c, future_visited, max_tier, allowed_difficulties
                )
                if future_neighbors > 0:
                    non_dead.append(c)

            if non_dead:
                candidates = non_dead

        next_term = random.choice(candidates)
        route.append(next_term)
        visited.add(next_term)

    return route


def _try_from_start(
    start_term_id: int,
    target_length: int,
    difficulty: str = 'hard',
    max_retries: int = 10
) -> List[int]:
    """
    同じスタート地点からリトライしてルート生成を試みる（内部用）

    要求されたステップ数に達しない場合、同じスタートから再試行する。

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長
        difficulty: 難易度 ('easy', 'normal', 'hard')
        max_retries: 最大リトライ回数（デフォルト10）

    Returns:
        用語IDのリスト（ルート）
    """
    best_route = []

    for _ in range(max_retries):
        route = _random_walk(start_term_id, target_length, difficulty)

        if len(route) >= target_length:
            return route

        if len(route) > len(best_route):
            best_route = route

    return best_route


def generate_route(
    target_length: int,
    difficulty: str = 'hard',
    seed: Optional[int] = None,
    max_start_retries: int = 10,
    max_same_start_retries: int = 10
) -> List[int]:
    """
    ルートを生成する（メインエントリポイント）

    1. ランダムにスタート地点を選ぶ
    2. 同じスタートで max_same_start_retries 回試す
    3. ダメなら別のスタート地点で再試行（最大 max_start_retries 回）

    Args:
        target_length: 目標ルート長
        difficulty: 難易度 ('easy', 'normal', 'hard')
        seed: 乱数シード（決定性のため）
        max_start_retries: スタート地点を変える最大回数（デフォルト10）
        max_same_start_retries: 同じスタートでのリトライ回数（デフォルト10）

    Returns:
        用語IDのリスト（ルート）
    """
    if seed is not None:
        random.seed(seed)

    best_route = []

    for _ in range(max_start_retries):
        # ランダムにスタート地点を選ぶ
        start_term_id = select_random_start(difficulty)

        # 同じスタートでリトライ
        route = _try_from_start(
            start_term_id, target_length, difficulty,
            max_retries=max_same_start_retries
        )

        if len(route) >= target_length:
            return route

        if len(route) > len(best_route):
            best_route = route

    # 全て失敗した場合、最長のものを返す
    return best_route
