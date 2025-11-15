-- 001_create_tables.sql
-- 歴史チェーンゲームのDB設計（事前ルート生成方式）
-- GPT議論を基にした設計

-- ===================================
-- 1. 用語テーブル（terms）
-- ===================================
CREATE TABLE IF NOT EXISTS terms (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    era TEXT NOT NULL,          -- '古代', '中世', '近世', '近代', '現代'
    tags TEXT[],                -- ['政治', '戦争', '文化', '宗教']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE terms IS '歴史用語マスタ';
COMMENT ON COLUMN terms.name IS '用語名（例：明治維新）';
COMMENT ON COLUMN terms.era IS '時代区分';
COMMENT ON COLUMN terms.tags IS 'タグ（カテゴリ）';

-- ===================================
-- 2. リレーションテーブル（relations）
-- ===================================
CREATE TABLE IF NOT EXISTS relations (
    id SERIAL PRIMARY KEY,
    src_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    dst_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,    -- '因果', '契機', '対立', '政策', '文化', '同時代'
    keyword TEXT,                   -- 短い説明（例：「政治改革」）
    explanation TEXT,               -- 詳細説明
    weight REAL DEFAULT 1.0,
    system_generated BOOLEAN DEFAULT FALSE,  -- 自動補完フラグ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (src_id, dst_id, relation_type)  -- 同じペアの同じ関係は1つのみ
);

COMMENT ON TABLE relations IS '用語間のリレーション（辺）';
COMMENT ON COLUMN relations.src_id IS '起点用語ID';
COMMENT ON COLUMN relations.dst_id IS '終点用語ID';
COMMENT ON COLUMN relations.relation_type IS 'リレーション種別';
COMMENT ON COLUMN relations.keyword IS '簡潔な説明';
COMMENT ON COLUMN relations.explanation IS '詳細な説明';
COMMENT ON COLUMN relations.system_generated IS 'true = 自動補完（後で置換推奨）';

-- インデックス
CREATE INDEX idx_relations_src ON relations(src_id);
CREATE INDEX idx_relations_dst ON relations(dst_id);
CREATE INDEX idx_relations_type ON relations(relation_type);

-- ===================================
-- 3. ルートテーブル（routes）
-- ===================================
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    start_term_id BIGINT NOT NULL REFERENCES terms(id),
    length INT NOT NULL,
    difficulty TEXT,                    -- 'easy', 'std', 'hard'
    relation_filter TEXT[],             -- 許可するrelation_type（例：['因果','契機']）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE routes IS '事前生成されたゲームルート';
COMMENT ON COLUMN routes.name IS 'ルート名（任意）';
COMMENT ON COLUMN routes.start_term_id IS 'スタート用語';
COMMENT ON COLUMN routes.length IS 'ルートの長さ（ステップ数）';
COMMENT ON COLUMN routes.difficulty IS '難易度';
COMMENT ON COLUMN routes.relation_filter IS '使用するリレーション種別';

-- ===================================
-- 4. ルートステップテーブル（route_steps）
-- ===================================
CREATE TABLE IF NOT EXISTS route_steps (
    route_id BIGINT REFERENCES routes(id) ON DELETE CASCADE,
    step_no INT,                        -- 0, 1, 2, ...
    term_id BIGINT REFERENCES terms(id),
    from_relation_type TEXT,            -- 直前のステップとの関係（step_no=0ならNULL）
    PRIMARY KEY(route_id, step_no)
);

COMMENT ON TABLE route_steps IS 'ルートの各ステップ（一本道）';
COMMENT ON COLUMN route_steps.step_no IS 'ステップ番号（0始まり）';
COMMENT ON COLUMN route_steps.term_id IS 'このステップの用語ID';
COMMENT ON COLUMN route_steps.from_relation_type IS '直前のステップとの関係種別';

-- ===================================
-- 5. ダミー候補テーブル（route_distractors）
-- ===================================
CREATE TABLE IF NOT EXISTS route_distractors (
    route_id BIGINT,
    step_no INT,
    term_id BIGINT REFERENCES terms(id),
    PRIMARY KEY(route_id, step_no, term_id),
    FOREIGN KEY (route_id, step_no) REFERENCES route_steps(route_id, step_no) ON DELETE CASCADE
);

COMMENT ON TABLE route_distractors IS '各ステップの不正解候補（事前生成）';
COMMENT ON COLUMN route_distractors.step_no IS '対象ステップ';
COMMENT ON COLUMN route_distractors.term_id IS 'ダミー用語ID（正解とは繋がっていない）';

-- ===================================
-- 6. 便利ビュー
-- ===================================

-- 用語の次数（degree）を確認するビュー
CREATE OR REPLACE VIEW v_term_degrees AS
SELECT
    t.id,
    t.name,
    t.era,
    COALESCE(COUNT(r.id), 0) AS degree
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
GROUP BY t.id, t.name, t.era
ORDER BY degree ASC, t.id ASC;

COMMENT ON VIEW v_term_degrees IS '各用語の次数（リレーション数）を表示';

-- 次数2未満のノード（死に点）を検出するビュー
CREATE OR REPLACE VIEW v_dead_points AS
SELECT * FROM v_term_degrees WHERE degree < 2;

COMMENT ON VIEW v_dead_points IS '次数2未満のノード（ゲーム継続不可）';

-- ルートの品質チェックビュー
CREATE OR REPLACE VIEW v_route_quality AS
SELECT
    r.id AS route_id,
    r.name AS route_name,
    r.length,
    r.difficulty,
    COUNT(DISTINCT rs.term_id) AS unique_terms,
    COUNT(DISTINCT rd.term_id) AS total_distractors,
    CASE
        WHEN COUNT(DISTINCT rs.term_id) = r.length THEN 'OK'
        ELSE 'NG'
    END AS uniqueness_check,
    CASE
        WHEN COUNT(DISTINCT rd.term_id) >= 3 * (r.length - 1) THEN 'OK'
        ELSE 'NG'
    END AS distractor_check
FROM routes r
LEFT JOIN route_steps rs ON rs.route_id = r.id
LEFT JOIN route_distractors rd ON rd.route_id = r.id
GROUP BY r.id, r.name, r.length, r.difficulty
ORDER BY r.id;

COMMENT ON VIEW v_route_quality IS 'ルートの品質チェック（重複・ダミー数）';

-- ===================================
-- 7. トリガー（更新日時自動更新）
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_terms_updated_at
BEFORE UPDATE ON terms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ===================================
-- 完了
-- ===================================
-- マイグレーション001完了
