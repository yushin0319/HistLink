-- =======================================
-- データ品質チェックスクリプト
-- =======================================
-- 実行方法:
--   docker compose exec postgres psql -U histlink -d histlink -f /scripts/check_data_quality.sql
--   または
--   psql -h localhost -U histlink -d histlink -f database/scripts/check_data_quality.sql

\echo '=======================================';
\echo 'データ品質チェック開始';
\echo '=======================================';
\echo '';

-- =======================================
-- 1. 死に点チェック（degree < 2）
-- =======================================
\echo '【1】死に点チェック（degree < 2のノードがないこと）';
\echo '---';

SELECT
    COUNT(*) AS dead_points_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ OK - 死に点なし'
        ELSE '✗ NG - 死に点あり！'
    END AS status
FROM v_dead_points;

-- 死に点がある場合は詳細表示
SELECT
    id,
    name,
    era,
    degree
FROM v_dead_points
LIMIT 10;

\echo '';

-- =======================================
-- 2. 用語数チェック
-- =======================================
\echo '【2】用語数チェック（目標: 100語）';
\echo '---';

SELECT
    COUNT(*) AS term_count,
    CASE
        WHEN COUNT(*) = 100 THEN '✓ OK - 100語'
        WHEN COUNT(*) > 100 THEN '✓ OK - ' || COUNT(*) || '語（目標超過）'
        ELSE '✗ NG - ' || COUNT(*) || '語（不足）'
    END AS status
FROM terms;

\echo '';

-- =======================================
-- 3. リレーション数チェック
-- =======================================
\echo '【3】リレーション数チェック（目標: 300リレーション）';
\echo '---';

SELECT
    COUNT(*) AS relation_count,
    CASE
        WHEN COUNT(*) = 300 THEN '✓ OK - 300リレーション'
        WHEN COUNT(*) > 300 THEN '✓ OK - ' || COUNT(*) || 'リレーション（目標超過）'
        ELSE '✗ NG - ' || COUNT(*) || 'リレーション（不足）'
    END AS status
FROM relations;

\echo '';

-- =======================================
-- 4. 孤立ノードチェック
-- =======================================
\echo '【4】孤立ノードチェック（どこにも繋がっていないノード）';
\echo '---';

SELECT
    COUNT(*) AS isolated_nodes_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ OK - 孤立ノードなし'
        ELSE '✗ NG - 孤立ノードあり！'
    END AS status
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
WHERE r.id IS NULL;

-- 孤立ノードがある場合は詳細表示
SELECT
    t.id,
    t.name,
    t.era,
    '孤立' AS status
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
WHERE r.id IS NULL
LIMIT 10;

\echo '';

-- =======================================
-- 5. 自己ループチェック
-- =======================================
\echo '【5】自己ループチェック（src_id = dst_id）';
\echo '---';

SELECT
    COUNT(*) AS self_loop_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ OK - 自己ループなし'
        ELSE '✗ NG - 自己ループあり！'
    END AS status
FROM relations
WHERE src_id = dst_id;

-- 自己ループがある場合は詳細表示
SELECT
    id,
    src_id,
    dst_id,
    relation_type,
    '自己ループ' AS issue
FROM relations
WHERE src_id = dst_id
LIMIT 10;

\echo '';

-- =======================================
-- 6. 統計情報
-- =======================================
\echo '【6】統計情報';
\echo '---';

-- 時代別の用語数
\echo '時代別用語数:';
SELECT
    era,
    COUNT(*) AS term_count
FROM terms
GROUP BY era
ORDER BY
    CASE era
        WHEN '古代' THEN 1
        WHEN '中世' THEN 2
        WHEN '近世' THEN 3
        WHEN '近代' THEN 4
        WHEN '現代' THEN 5
        ELSE 6
    END;

\echo '';

-- リレーションタイプ別の数
\echo 'リレーションタイプ別数:';
SELECT
    relation_type,
    COUNT(*) AS count
FROM relations
GROUP BY relation_type
ORDER BY count DESC;

\echo '';

-- 次数の統計
\echo '次数の統計:';
SELECT
    MIN(degree) AS min_degree,
    MAX(degree) AS max_degree,
    ROUND(AVG(degree), 2) AS avg_degree,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY degree) AS median_degree
FROM v_term_degrees;

\echo '';

-- =======================================
-- 7. サマリー
-- =======================================
\echo '=======================================';
\echo 'チェック完了';
\echo '=======================================';
\echo '';
\echo '次のステップ:';
\echo '  1. 問題がある場合は、database/migrations/002_seed_data.sql を修正';
\echo '  2. 修正後、マイグレーションを再実行';
\echo '  3. 再度このスクリプトを実行して確認';
\echo '';
