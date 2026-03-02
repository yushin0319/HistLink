-- ========================================
-- ランキング取得用SQLクエリ（参考）
-- ========================================
-- 共通パラメータ:
--   :total_steps  整数 | NULL（NULL = 全問題数）
--   :since        TIMESTAMP | NULL（NULL = 全期間）
--   :limit        上位件数
--
-- 使用例:
--   全体ランキング         → total_steps = NULL, since = NULL
--   10問限定ランキング     → total_steps = 10,   since = NULL
--   週間ランキング         → total_steps = NULL, since = NOW() - INTERVAL '7 days'
--   月間10問ランキング     → total_steps = 10,   since = NOW() - INTERVAL '30 days'
-- ========================================

-- ランキング取得（共通テンプレート）
SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) AS rank,
    user_name,
    score,
    cleared_steps,
    array_length(terms, 1) - 1 AS total_steps,
    created_at AS played_at
FROM games
WHERE user_name IS NOT NULL
  AND (:total_steps IS NULL OR array_length(terms, 1) - 1 = :total_steps)
  AND (:since      IS NULL OR created_at >= :since)
ORDER BY score DESC, created_at ASC
LIMIT :limit;


-- 特定プレイヤーの順位を取得
WITH ranked AS (
    SELECT
        user_name,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) AS rank
    FROM games
    WHERE user_name IS NOT NULL
      AND (:total_steps IS NULL OR array_length(terms, 1) - 1 = :total_steps)
      AND (:since      IS NULL OR created_at >= :since)
)
SELECT rank, user_name, score
FROM ranked
WHERE user_name = :user_name;


-- プレイヤーの統計情報
SELECT
    user_name,
    COUNT(*)                                              AS total_games,
    MAX(score)                                            AS best_score,
    AVG(score)::INTEGER                                   AS avg_score,
    SUM(CASE WHEN cleared_steps > 0 THEN 1 ELSE 0 END)   AS completed_games
FROM games
WHERE user_name IS NOT NULL
GROUP BY user_name
ORDER BY best_score DESC;
