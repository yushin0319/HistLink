-- ========================================
-- ランキング取得用SQLクエリ（参考）
-- ========================================

-- 全体ランキング（TOP 100）
SELECT
    player_name,
    score,
    current_step AS stages_completed,
    created_at AS played_at
FROM games
WHERE is_finished = true
  AND player_name IS NOT NULL
ORDER BY score DESC, created_at ASC
LIMIT 100;

-- 難易度別ランキング（routesテーブルと結合）
SELECT
    g.player_name,
    g.score,
    g.current_step AS stages_completed,
    r.difficulty,
    r.length AS total_stages,
    g.created_at AS played_at
FROM games g
JOIN routes r ON g.route_id = r.id
WHERE g.is_finished = true
  AND g.player_name IS NOT NULL
  AND r.difficulty = 'normal'  -- 'easy', 'normal', 'hard'
  AND r.length = 10             -- 10, 30, 50
ORDER BY g.score DESC, g.created_at ASC
LIMIT 100;

-- 特定プレイヤーの順位を取得
WITH ranked_games AS (
    SELECT
        player_name,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) AS rank
    FROM games
    WHERE is_finished = true
      AND player_name IS NOT NULL
)
SELECT rank, player_name, score
FROM ranked_games
WHERE player_name = 'YourName';

-- 週間ランキング（過去7日間）
SELECT
    player_name,
    score,
    current_step AS stages_completed,
    created_at AS played_at
FROM games
WHERE is_finished = true
  AND player_name IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY score DESC, created_at ASC
LIMIT 100;

-- 月間ランキング（過去30日間）
SELECT
    player_name,
    score,
    current_step AS stages_completed,
    created_at AS played_at
FROM games
WHERE is_finished = true
  AND player_name IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY score DESC, created_at ASC
LIMIT 100;

-- プレイヤーの統計情報
SELECT
    player_name,
    COUNT(*) AS total_games,
    MAX(score) AS best_score,
    AVG(score)::INTEGER AS avg_score,
    SUM(CASE WHEN is_finished = true THEN 1 ELSE 0 END) AS completed_games
FROM games
WHERE player_name IS NOT NULL
GROUP BY player_name
ORDER BY best_score DESC;
