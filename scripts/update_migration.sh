#!/bin/bash
# TSVファイルからデータベースを完全再構築
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
-- terms テーブル
CREATE TABLE terms (
    id INTEGER NOT NULL DEFAULT nextval('terms_id_seq'::regclass),
    name VARCHAR(100) NOT NULL,
    era VARCHAR(50) NOT NULL,
    year INTEGER,
    tags JSONB DEFAULT '[]'::jsonb,
    description TEXT NOT NULL,
    PRIMARY KEY (id)
);

-- relations テーブル（id列あり）
CREATE TABLE relations (
    id INTEGER NOT NULL DEFAULT nextval('relations_id_seq'::regclass),
    src_id INTEGER NOT NULL,
    dst_id INTEGER NOT NULL,
    relation_type VARCHAR(50) NOT NULL,
    keyword VARCHAR(100),
    explanation TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (src_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (dst_id) REFERENCES terms(id) ON DELETE CASCADE
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
CREATE INDEX idx_relations_src ON relations(src_id);
CREATE INDEX idx_relations_dst ON relations(dst_id);
CREATE INDEX idx_terms_era ON terms(era);
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
    t.era,
    COALESCE(COUNT(DISTINCT r.id), 0) AS degree
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
GROUP BY t.id, t.name, t.era
ORDER BY degree DESC, t.id;

COMMENT ON VIEW v_term_degrees IS '用語ごとの次数（リレーション数）';

-- 死に点（degree < 2）を表示するビュー
CREATE VIEW v_dead_points AS
SELECT id, name, era, degree
FROM v_term_degrees
WHERE degree < 2;

COMMENT ON VIEW v_dead_points IS '次数が2未満の用語（死に点）';

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

# 5. ヘッダー行を除いたTSVファイルを準備してコンテナにコピー
echo "📋 TSVファイルをコピー中..."
tail -n +2 data/terms.tsv > /tmp/terms_data.tsv
tail -n +2 data/relations.tsv > /tmp/relations_data.tsv
docker cp /tmp/terms_data.tsv histlink-postgres:/tmp/terms.tsv
docker cp /tmp/relations_data.tsv histlink-postgres:/tmp/relations.tsv
rm /tmp/terms_data.tsv /tmp/relations_data.tsv

# 6. データインポート
echo "📥 データインポート中..."
docker compose exec -T postgres psql -U histlink_user -d histlink << 'EOF'
-- termsテーブルにインポート（IDを含む）
COPY terms (id, name, era, year, tags, description)
FROM '/tmp/terms.tsv'
WITH (FORMAT text, DELIMITER E'\t', ENCODING 'UTF8');

-- relationsテーブルにインポート（IDは自動採番）
COPY relations (src_id, dst_id, relation_type, keyword, explanation)
FROM '/tmp/relations.tsv'
WITH (FORMAT text, DELIMITER E'\t', ENCODING 'UTF8');

-- シーケンス値を調整
SELECT pg_catalog.setval('terms_id_seq', (SELECT MAX(id) FROM terms), true);
SELECT pg_catalog.setval('relations_id_seq', (SELECT MAX(id) FROM relations), true);
EOF

# 7. 一時ファイル削除
echo "🧹 一時ファイル削除中..."
docker compose exec -T postgres rm -f /tmp/terms.tsv /tmp/relations.tsv

echo ""
echo "✅ 完了！"
echo ""
echo "📊 統計:"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT COUNT(*) AS terms FROM terms;"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT COUNT(*) AS relations FROM relations;"
echo ""
echo "📈 用語の時代別分布:"
docker compose exec -T postgres psql -U histlink_user -d histlink -c "SELECT era, COUNT(*) as count FROM terms GROUP BY era ORDER BY era;"
