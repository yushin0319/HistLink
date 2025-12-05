#!/bin/bash
# JSONファイルからデータベースを完全再構築
# UTF-8エンコーディングを保証

set -e

echo "🔄 データベースを再構築します..."

# 1. Docker起動確認
echo "📦 Dockerコンテナ確認..."
cd "$(dirname "$0")/.."
docker compose up -d

# 2. PostgreSQLが起動するまで待機
echo "⏳ PostgreSQL起動待機..."
sleep 3

# 3. データベースを完全に初期化
echo "🗑️  既存のスキーマを削除中..."
docker compose exec -T postgres psql -U histlink_user -d histlink << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO histlink_user;
GRANT ALL ON SCHEMA public TO public;
EOF

# 4. スキーマ作成（Functions, Tables, Views, Triggers）
echo "🏗️  スキーマ作成中..."
docker compose exec -T postgres psql -U histlink_user -d histlink << 'EOF'
-- ========================================
-- Functions
-- ========================================
CREATE FUNCTION update_games_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ========================================
-- Sequences
-- ========================================
CREATE SEQUENCE relations_id_seq AS integer;
CREATE SEQUENCE routes_id_seq;
CREATE SEQUENCE terms_id_seq AS integer;

-- ========================================
-- Tables
-- ========================================
-- terms テーブル（JSON対応: tier, category）
CREATE TABLE terms (
    id INTEGER NOT NULL DEFAULT nextval('terms_id_seq'::regclass),
    name VARCHAR(100) NOT NULL,
    tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 3),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (id)
);

-- relations テーブル（JSON対応: source, target, difficulty）
CREATE TABLE relations (
    id INTEGER NOT NULL DEFAULT nextval('relations_id_seq'::regclass),
    source INTEGER NOT NULL,
    target INTEGER NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard')),
    keyword VARCHAR(100),
    explanation TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (source) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES terms(id) ON DELETE CASCADE
);

-- routes テーブル
CREATE TABLE routes (
    id BIGINT NOT NULL DEFAULT nextval('routes_id_seq'::regclass),
    name TEXT,
    start_term_id BIGINT NOT NULL,
    length INTEGER NOT NULL,
    difficulty TEXT,
    relation_filter TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id)
);

-- route_steps テーブル
CREATE TABLE route_steps (
    route_id BIGINT NOT NULL,
    step_no INTEGER NOT NULL,
    term_id BIGINT,
    from_relation_type TEXT,
    PRIMARY KEY (route_id, step_no),
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

-- route_distractors テーブル
CREATE TABLE route_distractors (
    route_id BIGINT NOT NULL,
    step_no INTEGER NOT NULL,
    term_id BIGINT NOT NULL,
    PRIMARY KEY (route_id, step_no, term_id),
    FOREIGN KEY (route_id, step_no) REFERENCES route_steps(route_id, step_no) ON DELETE CASCADE
);

-- games テーブル
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    route_id BIGINT NOT NULL,
    player_name VARCHAR(50),
    current_step INTEGER DEFAULT 0 NOT NULL,
    lives INTEGER DEFAULT 3 NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    chain_count INTEGER DEFAULT 0 NOT NULL,
    is_finished BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    CONSTRAINT games_chain_count_check CHECK (chain_count >= 0),
    CONSTRAINT games_current_step_check CHECK (current_step >= 0),
    CONSTRAINT games_lives_check CHECK ((lives >= 0) AND (lives <= 5)),
    CONSTRAINT games_score_check CHECK (score >= 0)
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_relations_source ON relations(source);
CREATE INDEX idx_relations_target ON relations(target);
CREATE INDEX idx_relations_difficulty ON relations(difficulty);
CREATE INDEX idx_terms_tier ON terms(tier);
CREATE INDEX idx_terms_category ON terms(category);
CREATE INDEX idx_games_created_at ON games USING btree (created_at DESC);
CREATE INDEX idx_games_route_id ON games USING btree (route_id);
CREATE INDEX idx_games_ranking ON games USING btree (is_finished, score DESC) WHERE is_finished = true;

-- ========================================
-- Views
-- ========================================
-- 用語ごとの次数を計算するビュー
CREATE VIEW v_term_degrees AS
SELECT
    t.id,
    t.name,
    t.tier,
    t.category,
    COALESCE(COUNT(DISTINCT r.id), 0) AS degree
FROM terms t
LEFT JOIN relations r ON (r.source = t.id OR r.target = t.id)
GROUP BY t.id, t.name, t.tier, t.category
ORDER BY degree DESC, t.id;

COMMENT ON VIEW v_term_degrees IS '用語ごとの次数（リレーション数）';

-- 死に点（degree < 2）を表示するビュー
CREATE VIEW v_dead_points AS
SELECT id, name, tier, category, degree
FROM v_term_degrees
WHERE degree < 2;

COMMENT ON VIEW v_dead_points IS '次数が2未満の用語（死に点）';

-- Tier別統計ビュー
CREATE VIEW v_tier_stats AS
SELECT
    tier,
    COUNT(*) AS term_count,
    (SELECT COUNT(*) FROM relations r
     JOIN terms t1 ON r.source = t1.id
     JOIN terms t2 ON r.target = t2.id
     WHERE t1.tier = t.tier OR t2.tier = t.tier) AS relation_count
FROM terms t
GROUP BY tier
ORDER BY tier;

COMMENT ON VIEW v_tier_stats IS 'Tier別の用語数・リレーション数';

-- 難易度別統計ビュー
CREATE VIEW v_difficulty_stats AS
SELECT
    difficulty,
    COUNT(*) AS relation_count
FROM relations
GROUP BY difficulty
ORDER BY
    CASE difficulty
        WHEN 'easy' THEN 1
        WHEN 'normal' THEN 2
        WHEN 'hard' THEN 3
    END;

COMMENT ON VIEW v_difficulty_stats IS '難易度別のリレーション数';

-- ルート品質チェックビュー
CREATE VIEW v_route_quality AS
SELECT r.id AS route_id,
    r.name AS route_name,
    r.length,
    r.difficulty,
    count(DISTINCT rs.term_id) AS unique_terms,
    count(DISTINCT rd.term_id) AS total_distractors,
    CASE
        WHEN (count(DISTINCT rs.term_id) = r.length) THEN 'OK'::text
        ELSE 'NG'::text
    END AS uniqueness_check,
    CASE
        WHEN (count(DISTINCT rd.term_id) >= (3 * (r.length - 1))) THEN 'OK'::text
        ELSE 'NG'::text
    END AS distractor_check
FROM ((routes r
    LEFT JOIN route_steps rs ON ((rs.route_id = r.id)))
    LEFT JOIN route_distractors rd ON ((rd.route_id = r.id)))
GROUP BY r.id, r.name, r.length, r.difficulty
ORDER BY r.id;

COMMENT ON VIEW v_route_quality IS 'ルートの品質チェック（重複・ダミー数）';

-- ========================================
-- Triggers
-- ========================================
CREATE TRIGGER games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_games_updated_at();

-- ========================================
-- Sequence Ownership
-- ========================================
ALTER SEQUENCE relations_id_seq OWNED BY relations.id;
ALTER SEQUENCE routes_id_seq OWNED BY routes.id;
ALTER SEQUENCE terms_id_seq OWNED BY terms.id;

EOF

# 5. Node.jsスクリプトでデータをインポート
echo "📥 JSONデータをインポート中..."
node scripts/import_json.js

echo ""
echo "📊 統計:"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT COUNT(*) AS terms FROM terms;"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT COUNT(*) AS relations FROM relations;"
echo ""
echo "📈 Tier別分布:"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT tier, COUNT(*) as count FROM terms GROUP BY tier ORDER BY tier;"
echo ""
echo "📈 難易度別分布:"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT difficulty, COUNT(*) as count FROM relations GROUP BY difficulty ORDER BY difficulty;"
