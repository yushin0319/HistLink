"""
ルート生成アルゴリズム

事前ルート生成方式：
- BFS距離前進優先
- スコアリング式：+2*dist_up + 1*residual_deg_capped - 3*triangle_hit
- バックトラック対応
"""

from typing import Dict, List, Optional, Set
from collections import deque
from sqlalchemy import text
import random


def calculate_bfs_distances(start_term_id: int, db) -> Dict[int, int]:
    """
    BFS（幅優先探索）でstartからの最短距離を計算

    Args:
        start_term_id: スタート用語ID
        db: データベース接続

    Returns:
        {term_id: distance} の辞書
    """
    distances = {start_term_id: 0}
    queue = deque([start_term_id])
    visited = {start_term_id}

    while queue:
        current = queue.popleft()
        current_dist = distances[current]

        # 隣接ノードを取得（無向グラフとして扱う）
        result = db.execute(
            text("""
            SELECT dst_id FROM relations WHERE src_id = :current
            UNION
            SELECT src_id FROM relations WHERE dst_id = :current
            """),
            {"current": current}
        )

        for (neighbor_id,) in result:
            if neighbor_id not in visited:
                visited.add(neighbor_id)
                distances[neighbor_id] = current_dist + 1
                queue.append(neighbor_id)

    return distances


def get_unvisited_neighbors(term_id: int, visited: Set[int], db) -> List[int]:
    """
    未訪問の隣接ノードを取得

    Args:
        term_id: 現在のノードID
        visited: 訪問済みノードのセット
        db: データベース接続

    Returns:
        未訪問の隣接ノードIDリスト
    """
    result = db.execute(
        text("""
        SELECT dst_id FROM relations WHERE src_id = :term_id
        UNION
        SELECT src_id FROM relations WHERE dst_id = :term_id
        """),
        {"term_id": term_id}
    )

    neighbors = [row[0] for row in result]
    return [n for n in neighbors if n not in visited]


def count_unvisited_neighbors(term_id: int, visited: Set[int], db) -> int:
    """
    未訪問の隣接ノード数をカウント（残余次数）

    Args:
        term_id: ノードID
        visited: 訪問済みノードのセット
        db: データベース接続

    Returns:
        未訪問の隣接ノード数
    """
    neighbors = get_unvisited_neighbors(term_id, visited, db)
    return len(neighbors)


def count_triangle_hits(candidate_id: int, recent_route: List[int], db) -> int:
    """
    候補ノードが直近のルートノードと繋がっている数（三角形ヒット）

    Args:
        candidate_id: 候補ノードID
        recent_route: 直近3手のルート
        db: データベース接続

    Returns:
        recent_routeとの接続数（0〜3）
    """
    if not recent_route:
        return 0

    # candidateの隣接ノードを取得
    result = db.execute(
        text("""
        SELECT dst_id FROM relations WHERE src_id = :candidate
        UNION
        SELECT src_id FROM relations WHERE dst_id = :candidate
        """),
        {"candidate": candidate_id}
    )

    neighbors = {row[0] for row in result}

    # recent_routeとの重複をカウント
    hits = sum(1 for node in recent_route if node in neighbors)
    return hits


def calculate_score(
    candidate_id: int,
    current_id: int,
    visited: Set[int],
    bfs_distances: Dict[int, int],
    recent_route: List[int],
    db
) -> float:
    """
    候補ノードのスコアを計算

    スコアリング式：
    score = +2*dist_up + 1*residual_deg_capped - 3*triangle_hit

    Args:
        candidate_id: 候補ノードID
        current_id: 現在のノードID
        visited: 訪問済みノードのセット
        bfs_distances: BFS距離の辞書
        recent_route: 直近3手のルート
        db: データベース接続

    Returns:
        スコア（浮動小数点数）
    """
    # dist_up: BFS距離が増える方向を優先
    dist_up = bfs_distances.get(candidate_id, 0) - bfs_distances.get(current_id, 0)

    # residual_deg: 残余次数（上限5）
    residual_deg = count_unvisited_neighbors(candidate_id, visited, db)
    residual_deg_capped = min(residual_deg, 5)

    # triangle_hit: 直近3手との接続を避ける
    triangle_hit = count_triangle_hits(candidate_id, recent_route[-3:], db)

    # スコア計算
    score = 2 * dist_up + 1 * residual_deg_capped - 3 * triangle_hit

    return score


def select_random_start(db, era: Optional[str] = None, seed: Optional[int] = None) -> int:
    """
    ランダムにスタート地点を選ぶ

    Args:
        db: データベース接続
        era: 時代フィルタ（オプション）
        seed: 乱数シード（オプション）

    Returns:
        ランダムに選ばれた用語ID
    """
    if seed is not None:
        random.seed(seed)

    if era is not None:
        result = db.execute(
            text("SELECT id FROM terms WHERE era = :era"),
            {"era": era}
        )
    else:
        result = db.execute(text("SELECT id FROM terms"))

    all_ids = [row[0] for row in result]

    if not all_ids:
        raise ValueError(f"No terms found with era={era}")

    return random.choice(all_ids)


def generate_route(
    start_term_id: int,
    target_length: int,
    db,
    seed: Optional[int] = None
) -> List[int]:
    """
    ルートを生成する

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長
        db: データベース接続
        seed: 乱数シード（決定性のため）

    Returns:
        用語IDのリスト（ルート）
    """
    if seed is not None:
        random.seed(seed)

    route = [start_term_id]
    visited = {start_term_id}
    bfs_distances = calculate_bfs_distances(start_term_id, db)

    while len(route) < target_length:
        current = route[-1]
        candidates = get_unvisited_neighbors(current, visited, db)

        # 候補がなければ終了（詰まった）
        if not candidates:
            break

        # スコアリング
        scored_candidates = []
        for candidate in candidates:
            score = calculate_score(
                candidate,
                current,
                visited,
                bfs_distances,
                route,
                db
            )
            scored_candidates.append((score, candidate))

        # 最高スコアの候補を選択
        scored_candidates.sort(reverse=True)
        best_score = scored_candidates[0][0]

        # 同点の候補を抽出
        tied_candidates = [c for c in scored_candidates if c[0] == best_score]

        # 同点ならランダム選択、そうでなければ最初
        if len(tied_candidates) > 1:
            next_term = random.choice(tied_candidates)[1]
        else:
            next_term = scored_candidates[0][1]

        route.append(next_term)
        visited.add(next_term)

    return route
