#!/usr/bin/env python3
"""
Easy-50ルートを事前生成してDBに保存するスクリプト

Usage:
    docker compose exec backend python scripts/generate_easy50_routes.py [--count 1000]

Easy-50は成功率約3.3%（約30回試行で1成功）のため、
その場生成ではなく事前登録方式を採用。
"""
import sys
sys.path.insert(0, '/app')

import argparse
import random
import time
from collections import deque
from typing import List, Set, Dict

from sqlalchemy import text
from app.database import SessionLocal


def get_unvisited_neighbors(
    term_id: int,
    visited: Set[int],
    db,
    max_tier: int,
    allowed_difficulties: List[str]
) -> List[int]:
    """未訪問の隣接ノードを取得"""
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
    max_tier: int,
    allowed_difficulties: List[str]
) -> int:
    """未訪問の隣接ノード数をカウント"""
    return len(get_unvisited_neighbors(term_id, visited, db, max_tier, allowed_difficulties))


def generate_route_random(
    start_id: int,
    target_length: int,
    db,
    max_tier: int = 1,
    allowed_difficulties: List[str] = None
) -> List[int]:
    """
    ランダムウォーク（行き止まり回避付き）でルート生成

    Args:
        start_id: スタート用語ID
        target_length: 目標ルート長
        db: データベース接続
        max_tier: 最大Tier
        allowed_difficulties: 許可されるエッジ難易度

    Returns:
        用語IDのリスト（ルート）
    """
    if allowed_difficulties is None:
        allowed_difficulties = ['easy']

    route = [start_id]
    visited = {start_id}

    while len(route) < target_length:
        current = route[-1]
        candidates = get_unvisited_neighbors(
            current, visited, db, max_tier, allowed_difficulties
        )

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


def generate_distractors(
    correct_id: int,
    current_id: int,
    visited: Set[int],
    db,
    max_tier: int = 1,
    count: int = 3
) -> List[int]:
    """
    ダミー選択肢を生成（2hop以上離れた未訪問ノード）

    Args:
        correct_id: 正解のノードID
        current_id: 現在のノードID
        visited: 訪問済みノードセット
        db: データベース接続
        max_tier: 最大Tier
        count: 生成するダミー数

    Returns:
        ダミーノードIDのリスト
    """
    # 1hop隣接ノードを取得（除外用）
    result = db.execute(
        text("""
        SELECT DISTINCT t.id
        FROM terms t
        JOIN relations r ON (r.target = t.id OR r.source = t.id)
        WHERE t.tier <= :max_tier
          AND r.difficulty = 'easy'
          AND (
              (r.source = :current AND r.target = t.id)
              OR (r.target = :current AND r.source = t.id)
          )
        """),
        {"current": current_id, "max_tier": max_tier}
    )
    one_hop = {row[0] for row in result}

    # 全候補ノードを取得
    result = db.execute(
        text("SELECT id FROM terms WHERE tier <= :max_tier"),
        {"max_tier": max_tier}
    )
    all_nodes = {row[0] for row in result}

    # 除外: 訪問済み + 1hop隣接 + 正解
    excluded = visited | one_hop | {correct_id}
    candidates = list(all_nodes - excluded)

    if len(candidates) < count:
        # 候補が足りない場合は1hopも含める（ただし訪問済みと正解は除外）
        candidates = list(all_nodes - visited - {correct_id})

    random.shuffle(candidates)
    return candidates[:count]


def save_route_to_db(route: List[int], distractors_per_step: Dict[int, List[int]], db) -> int:
    """
    ルートをDBに保存

    Args:
        route: ルート（用語IDリスト）
        distractors_per_step: 各ステップのダミー選択肢
        db: データベース接続

    Returns:
        保存したルートID
    """
    # routesテーブルに挿入
    result = db.execute(
        text("""
        INSERT INTO routes (name, start_term_id, length, difficulty, relation_filter)
        VALUES (:name, :start_id, :length, 'easy', ARRAY['easy'])
        RETURNING id
        """),
        {
            "name": f"easy-50-pregenerated",
            "start_id": route[0],
            "length": len(route)
        }
    )
    route_id = result.fetchone()[0]

    # route_stepsテーブルに挿入
    for step_no, term_id in enumerate(route):
        db.execute(
            text("""
            INSERT INTO route_steps (route_id, step_no, term_id, from_relation_type)
            VALUES (:route_id, :step_no, :term_id, 'easy')
            """),
            {"route_id": route_id, "step_no": step_no, "term_id": term_id}
        )

    # route_distractorsテーブルに挿入
    for step_no, distractor_ids in distractors_per_step.items():
        for distractor_id in distractor_ids:
            db.execute(
                text("""
                INSERT INTO route_distractors (route_id, step_no, term_id)
                VALUES (:route_id, :step_no, :term_id)
                """),
                {"route_id": route_id, "step_no": step_no, "term_id": distractor_id}
            )

    return route_id


def main():
    parser = argparse.ArgumentParser(description='Easy-50ルートを事前生成')
    parser.add_argument('--count', type=int, default=100, help='生成するルート数')
    parser.add_argument('--dry-run', action='store_true', help='DBに保存しない')
    args = parser.parse_args()

    db = SessionLocal()

    # 既存のeasy-50ルート数を確認
    result = db.execute(
        text("SELECT COUNT(*) FROM routes WHERE difficulty = 'easy' AND length = 50")
    )
    existing_count = result.fetchone()[0]
    print(f"既存のeasy-50ルート数: {existing_count}")

    # Easy用語IDを取得
    result = db.execute(text("SELECT id FROM terms WHERE tier = 1"))
    easy_term_ids = [row[0] for row in result]
    print(f"Easy用語数: {len(easy_term_ids)}")

    if not easy_term_ids:
        print("Error: Tier1の用語がありません")
        return

    target_length = 50
    success_count = 0
    attempt_count = 0
    start_time = time.time()

    print(f"\n目標: {args.count}ルート生成")
    print("=" * 50)

    while success_count < args.count:
        attempt_count += 1

        # ランダムにスタート地点を選択
        start_id = random.choice(easy_term_ids)

        # ルート生成
        route = generate_route_random(
            start_id, target_length, db,
            max_tier=1, allowed_difficulties=['easy']
        )

        if len(route) >= target_length:
            success_count += 1

            if not args.dry_run:
                # ダミー選択肢を生成
                visited = set(route)
                distractors = {}
                for step_no in range(len(route) - 1):
                    current_id = route[step_no]
                    correct_id = route[step_no + 1]
                    distractors[step_no] = generate_distractors(
                        correct_id, current_id, visited, db, max_tier=1, count=3
                    )

                # DBに保存
                route_id = save_route_to_db(route, distractors, db)
                db.commit()

                elapsed = time.time() - start_time
                rate = success_count / attempt_count * 100
                print(f"[{success_count}/{args.count}] Route ID: {route_id} "
                      f"(attempts: {attempt_count}, rate: {rate:.1f}%, "
                      f"elapsed: {elapsed:.1f}s)")
            else:
                elapsed = time.time() - start_time
                rate = success_count / attempt_count * 100
                print(f"[{success_count}/{args.count}] DRY-RUN "
                      f"(attempts: {attempt_count}, rate: {rate:.1f}%, "
                      f"elapsed: {elapsed:.1f}s)")

        # 進捗表示（100回ごと）
        if attempt_count % 100 == 0 and success_count == 0:
            elapsed = time.time() - start_time
            print(f"  ... {attempt_count} attempts, {elapsed:.1f}s")

    elapsed = time.time() - start_time
    print("=" * 50)
    print(f"完了!")
    print(f"  生成ルート数: {success_count}")
    print(f"  総試行回数: {attempt_count}")
    print(f"  成功率: {success_count / attempt_count * 100:.1f}%")
    print(f"  所要時間: {elapsed:.1f}秒")
    print(f"  平均生成時間: {elapsed / success_count * 1000:.0f}ms/ルート")

    db.close()


if __name__ == '__main__':
    main()
