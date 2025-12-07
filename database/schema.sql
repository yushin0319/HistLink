-- HistLink Database Schema
-- 使用方法: Docker起動時に自動実行される

-- 既存テーブルを削除（クリーンスタート）
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS terms CASCADE;

-- terms: 用語マスタ
CREATE TABLE terms (
    id integer PRIMARY KEY,
    name varchar(100) NOT NULL,
    tier integer NOT NULL DEFAULT 1,
    category varchar(50) NOT NULL,
    description text DEFAULT ''
);

CREATE INDEX idx_terms_tier ON terms(tier);
CREATE INDEX idx_terms_category ON terms(category);

COMMENT ON TABLE terms IS '歴史用語マスタ';
COMMENT ON COLUMN terms.tier IS '難易度Tier (1=易, 2=中, 3=難)';
COMMENT ON COLUMN terms.category IS '時代・カテゴリ';

-- edges: 用語間の関係
CREATE TABLE edges (
    id integer PRIMARY KEY,
    term_a integer NOT NULL REFERENCES terms(id),
    term_b integer NOT NULL REFERENCES terms(id),
    difficulty varchar(10) NOT NULL DEFAULT 'normal',
    keyword varchar(100) DEFAULT '',
    description text DEFAULT '',
    CONSTRAINT edges_term_order CHECK (term_a < term_b),
    CONSTRAINT edges_unique UNIQUE (term_a, term_b)
);

CREATE INDEX idx_edges_term_a ON edges(term_a);
CREATE INDEX idx_edges_term_b ON edges(term_b);
CREATE INDEX idx_edges_difficulty ON edges(difficulty);

COMMENT ON TABLE edges IS '用語間の関係（エッジ）';
COMMENT ON COLUMN edges.difficulty IS 'エッジ難易度 (easy/normal/hard)';
COMMENT ON COLUMN edges.keyword IS '関係を表すキーワード';

-- games: ゲームプレイ履歴（リザルト保存用）
CREATE TABLE games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    difficulty text NOT NULL,
    terms integer[] NOT NULL,
    cleared_steps integer DEFAULT 0 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    lives integer DEFAULT 3 NOT NULL,
    user_name varchar(20) DEFAULT 'GUEST' NOT NULL,
    false_steps integer[] DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT games_lives_check CHECK (lives >= 0 AND lives <= 5),
    CONSTRAINT games_score_check CHECK (score >= 0),
    CONSTRAINT games_cleared_steps_check CHECK (cleared_steps >= 0)
);

CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_score ON games(score DESC);

-- updated_atトリガー
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_games_updated_at();

COMMENT ON TABLE games IS 'ゲームプレイ履歴（リザルト）';
COMMENT ON COLUMN games.terms IS 'ルートの用語ID配列';
COMMENT ON COLUMN games.cleared_steps IS 'クリアしたステップ数';
COMMENT ON COLUMN games.user_name IS 'プレイヤー名';
COMMENT ON COLUMN games.false_steps IS '間違えたステップ番号の配列';
