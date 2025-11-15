"""
ダミー生成ロジック

難易度別のダミー候補を生成:
- Easy: 時代2つ以上違い、2hop以上離れた
- Standard: 時代±1、2hop以上離れた
- Hard: 同時代、2hop以上離れた

全難易度共通: 正解とは直接繋がっていない（2hop以上離れている）
"""

from typing import Dict, List, Optional, Set
from collections import deque
import random
from sqlalchemy import text


def get_term_info(term_id: int, db) -> Optional[Dict]:
    """
    用語情報を取得

    Args:
        term_id: 用語ID
        db: データベース接続

    Returns:
        用語情報の辞書 (id, name, era, tags)
    """
    result = db.execute(
        text("SELECT id, name, era, tags FROM terms WHERE id = :term_id"),
        {"term_id": term_id}
    ).fetchone()

    if result is None:
        return None

    return {
        'id': result[0],
        'name': result[1],
        'era': result[2],
        'tags': result[3] if result[3] else []
    }


def get_all_neighbors(db) -> Dict[int, Set[int]]:
    """
    全ノードの隣接関係を取得（1hop）

    Args:
        db: データベース接続

    Returns:
        {node_id: {隣接ノードのセット}} の辞書
    """
    result = db.execute(text("SELECT src_id, dst_id FROM relations"))

    neighbors = {}
    for src_id, dst_id in result:
        # 無向グラフとして扱う
        neighbors.setdefault(src_id, set()).add(dst_id)
        neighbors.setdefault(dst_id, set()).add(src_id)

    return neighbors


def calculate_distance_between(term_id1: int, term_id2: int, db) -> Optional[int]:
    """
    2つの用語間の最短距離を計算（BFS）

    Args:
        term_id1: 用語1のID
        term_id2: 用語2のID
        db: データベース接続

    Returns:
        最短距離（到達不可能な場合はNone）
    """
    if term_id1 == term_id2:
        return 0

    distances = {term_id1: 0}
    queue = deque([term_id1])
    visited = {term_id1}

    while queue:
        current = queue.popleft()
        current_dist = distances[current]

        # 隣接ノードを取得
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

                # 目標に到達
                if neighbor_id == term_id2:
                    return distances[neighbor_id]

    # 到達不可能
    return None


def count_common_tags(term_id1: int, term_id2: int, db) -> int:
    """
    2つの用語の共通タグ数をカウント

    Args:
        term_id1: 用語1のID
        term_id2: 用語2のID
        db: データベース接続

    Returns:
        共通タグ数
    """
    info1 = get_term_info(term_id1, db)
    info2 = get_term_info(term_id2, db)

    if info1 is None or info2 is None:
        return 0

    tags1 = set(info1['tags'])
    tags2 = set(info2['tags'])

    return len(tags1 & tags2)


def get_era_neighbors(era: str) -> List[str]:
    """
    指定された時代の前後の時代を取得

    Args:
        era: 時代名

    Returns:
        前後の時代のリスト（±1）
    """
    era_order = ['古代', '中世', '近世', '近代', '現代']

    if era not in era_order:
        return []

    idx = era_order.index(era)
    neighbors = []

    # 前の時代
    if idx > 0:
        neighbors.append(era_order[idx - 1])

    # 同じ時代も含む
    neighbors.append(era)

    # 次の時代
    if idx < len(era_order) - 1:
        neighbors.append(era_order[idx + 1])

    return neighbors


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
    ダミー候補を生成

    Args:
        correct_id: 正解の用語ID
        current_id: 現在の用語ID
        visited: 訪問済み用語のセット
        difficulty: 難易度 ('easy', 'standard', 'hard')
        count: 生成するダミー数
        db: データベース接続
        seed: 乱数シード（決定性のため）

    Returns:
        ダミー用語IDのリスト
    """
    if seed is not None:
        random.seed(seed)

    correct_info = get_term_info(correct_id, db)
    if correct_info is None:
        return []

    # 全ノードの隣接関係を一度だけ取得（高速化）
    neighbors = get_all_neighbors(db)

    # 候補プール
    candidates = []

    if difficulty == 'easy':
        # Easy: 時代違い、2hop以上離れた
        candidates = _generate_easy_candidates(correct_id, correct_info, visited, neighbors, db)

    elif difficulty == 'standard':
        # Standard: 時代±1、2hop以上離れた
        candidates = _generate_standard_candidates(correct_id, correct_info, visited, neighbors, db)

    elif difficulty == 'hard':
        # Hard: 同時代、2hop以上離れた
        candidates = _generate_hard_candidates(correct_id, correct_info, visited, neighbors, db)

    else:
        # デフォルトはstandard
        candidates = _generate_standard_candidates(correct_id, correct_info, visited, neighbors, db)

    # ランダムにcount個選択
    if len(candidates) <= count:
        return candidates
    else:
        return random.sample(candidates, count)


def _generate_easy_candidates(
    correct_id: int,
    correct_info: Dict,
    visited: Set[int],
    neighbors: Dict[int, Set[int]],
    db
) -> List[int]:
    """
    Easy難易度の候補を生成

    - 時代違い
    - 2hop以上離れた
    - タグ重複なし（オプション）
    """
    result = db.execute(
        text("""
        SELECT id FROM terms
        WHERE era != :correct_era
          AND id != :correct_id
        """),
        {
            "correct_era": correct_info['era'],
            "correct_id": correct_id
        }
    )

    # 正解の隣接ノード（1hop）を取得
    correct_neighbors = neighbors.get(correct_id, set())

    candidates = []
    for (term_id,) in result:
        # 訪問済みをスキップ
        if term_id in visited:
            continue

        # 1hop（直接繋がっている）を除外 → 2hop以上のみ残る
        if term_id in correct_neighbors:
            continue  # pragma: no cover

        candidates.append(term_id)

    return candidates


def _generate_standard_candidates(
    correct_id: int,
    correct_info: Dict,
    visited: Set[int],
    neighbors: Dict[int, Set[int]],
    db
) -> List[int]:
    """
    Standard難易度の候補を生成

    - 時代±1
    - 2hop以上離れた（直接繋がっていない）
    """
    # 時代±1の範囲
    era_neighbors = get_era_neighbors(correct_info['era'])

    # 同じ時代を除外（Standardは時代±1だけ）
    era_candidates = [e for e in era_neighbors if e != correct_info['era']]

    result = db.execute(
        text("""
        SELECT id FROM terms
        WHERE era = ANY(:eras)
          AND id != :correct_id
        """),
        {
            "eras": era_candidates,
            "correct_id": correct_id
        }
    )

    # 正解の隣接ノード（1hop）を取得
    correct_neighbors = neighbors.get(correct_id, set())

    candidates = []
    for (term_id,) in result:
        # 訪問済みをスキップ
        if term_id in visited:
            continue  # pragma: no cover

        # 1hop（直接繋がっている）を除外 → 2hop以上のみ残る
        if term_id in correct_neighbors:
            continue  # pragma: no cover

        candidates.append(term_id)

    return candidates


def _generate_hard_candidates(
    correct_id: int,
    correct_info: Dict,
    visited: Set[int],
    neighbors: Dict[int, Set[int]],
    db
) -> List[int]:
    """
    Hard難易度の候補を生成

    - 同時代
    - 2hop以上離れた（直接繋がっていない）
    - タグ2つ以上重複（オプション）
    """
    result = db.execute(
        text("""
        SELECT id FROM terms
        WHERE era = :correct_era
          AND id != :correct_id
        """),
        {
            "correct_era": correct_info['era'],
            "correct_id": correct_id
        }
    )

    # 正解の隣接ノード（1hop）を取得
    correct_neighbors = neighbors.get(correct_id, set())

    candidates = []
    for (term_id,) in result:
        # 訪問済みをスキップ
        if term_id in visited:
            continue

        # 1hop（直接繋がっている）を除外 → 2hop以上のみ残る
        if term_id in correct_neighbors:
            continue  # pragma: no cover

        candidates.append(term_id)

    return candidates
