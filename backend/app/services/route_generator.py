"""
ルート生成アルゴリズム（ランダムウォーク版）

ランダムウォーク方式：
- 行き止まり回避付きランダムウォーク
- BFSより2-9倍高速
- 同等の品質（ループなし、ユニークノード）

難易度別のデータ範囲:
- Easy: Tier1のみ + easyエッジのみ
- Normal: Tier1-2 + easy/normalエッジ
- Hard: 全Tier + 全エッジ
"""

from typing import List, Optional, Set
from sqlalchemy import text
import random


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
    db,
    max_tier: int = 3,
    allowed_difficulties: List[str] = None
) -> List[int]:
    """
    未訪問の隣接ノードを取得

    Args:
        term_id: 現在のノードID
        visited: 訪問済みノードのセット
        db: データベース接続
        max_tier: 最大Tier (難易度フィルタ用)
        allowed_difficulties: 許可されるエッジ難易度リスト

    Returns:
        未訪問の隣接ノードIDリスト
    """
    if allowed_difficulties is None:
        allowed_difficulties = ['easy', 'normal', 'hard']

    result = db.execute(
        text("""
        SELECT DISTINCT t.id
        FROM terms t
        JOIN relations r ON (r.target = t.id OR r.source = t.id)
        WHERE t.tier <= :max_tier
          AND r.difficulty = ANY(:difficulties)
          AND (
              (r.source = :term_id AND r.target = t.id)
              OR (r.target = :term_id AND r.source = t.id)
          )
        """),
        {
            "term_id": term_id,
            "max_tier": max_tier,
            "difficulties": allowed_difficulties
        }
    )

    neighbors = [row[0] for row in result]
    return [n for n in neighbors if n not in visited]


def count_unvisited_neighbors(
    term_id: int,
    visited: Set[int],
    db,
    max_tier: int = 3,
    allowed_difficulties: List[str] = None
) -> int:
    """
    未訪問の隣接ノード数をカウント（残余次数）

    Args:
        term_id: ノードID
        visited: 訪問済みノードのセット
        db: データベース接続
        max_tier: 最大Tier
        allowed_difficulties: 許可されるエッジ難易度リスト

    Returns:
        未訪問の隣接ノード数
    """
    neighbors = get_unvisited_neighbors(
        term_id, visited, db, max_tier, allowed_difficulties
    )
    return len(neighbors)


def select_random_start(
    db,
    difficulty: str = 'hard',
    seed: Optional[int] = None
) -> int:
    """
    ランダムにスタート地点を選ぶ（新仕様）

    Args:
        db: データベース接続
        difficulty: 難易度 ('easy', 'normal', 'hard')
        seed: 乱数シード（オプション）

    Returns:
        ランダムに選ばれた用語ID
    """
    if seed is not None:
        random.seed(seed)

    max_tier, _ = get_difficulty_filter(difficulty)

    result = db.execute(
        text("SELECT id FROM terms WHERE tier <= :max_tier"),
        {"max_tier": max_tier}
    )

    all_ids = [row[0] for row in result]

    if not all_ids:
        raise ValueError(f"No terms found with tier <= {max_tier}")

    return random.choice(all_ids)


def generate_route_single(
    start_term_id: int,
    target_length: int,
    db,
    difficulty: str = 'hard'
) -> List[int]:
    """
    単一のスタート地点からルートを生成する（ランダムウォーク版）

    行き止まり回避付きランダムウォークを使用。
    候補が複数あるとき、次の手で行き止まりにならない候補を優先する。

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長
        db: データベース接続
        difficulty: 難易度 ('easy', 'normal', 'hard')

    Returns:
        用語IDのリスト（ルート）
    """
    max_tier, allowed_difficulties = get_difficulty_filter(difficulty)

    route = [start_term_id]
    visited = {start_term_id}

    while len(route) < target_length:
        current = route[-1]
        candidates = get_unvisited_neighbors(
            current, visited, db, max_tier, allowed_difficulties
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
                    c, future_visited, db, max_tier, allowed_difficulties
                )
                if future_neighbors > 0:
                    non_dead.append(c)

            if non_dead:
                candidates = non_dead

        next_term = random.choice(candidates)
        route.append(next_term)
        visited.add(next_term)

    return route


def generate_route(
    start_term_id: int,
    target_length: int,
    db,
    difficulty: str = 'hard',
    seed: Optional[int] = None,
    max_retries: int = 10
) -> List[int]:
    """
    ルートを生成する（リトライ機能付き）

    要求されたステップ数に達しない場合、同じスタートから再試行する。

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長
        db: データベース接続
        difficulty: 難易度 ('easy', 'normal', 'hard')
        seed: 乱数シード（決定性のため）
        max_retries: 最大リトライ回数（デフォルト10）

    Returns:
        用語IDのリスト（ルート）
    """
    if seed is not None:
        random.seed(seed)

    # 最初の試行
    route = generate_route_single(start_term_id, target_length, db, difficulty)

    if len(route) >= target_length:
        return route

    # リトライ（同じスタートから、ランダム選択だけ変えて再試行）
    best_route = route

    for _ in range(max_retries):
        route = generate_route_single(start_term_id, target_length, db, difficulty)

        if len(route) >= target_length:
            return route

        if len(route) > len(best_route):
            best_route = route

    # max_retries回試しても達成できなかった場合、最長のものを返す
    return best_route


def generate_route_with_fallback(
    target_length: int,
    db,
    difficulty: str = 'hard',
    seed: Optional[int] = None,
    max_start_retries: int = 10,
    max_same_start_retries: int = 10
) -> List[int]:
    """
    ルートを生成する（スタート地点変更付きフォールバック）

    1. ランダムにスタート地点を選ぶ
    2. 同じスタートで max_same_start_retries 回試す
    3. ダメなら別のスタート地点で再試行（最大 max_start_retries 回）

    Args:
        target_length: 目標ルート長
        db: データベース接続
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
        start_term_id = select_random_start(db, difficulty)

        # 同じスタートでリトライ
        route = generate_route(
            start_term_id, target_length, db, difficulty,
            seed=None,  # 既にseed設定済みなのでNone
            max_retries=max_same_start_retries
        )

        if len(route) >= target_length:
            return route

        if len(route) > len(best_route):
            best_route = route

    # 全て失敗した場合、最長のものを返す
    return best_route
