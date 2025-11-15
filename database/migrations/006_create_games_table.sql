-- ゲーム状態を管理するテーブル
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    lives INTEGER NOT NULL DEFAULT 3,
    score INTEGER NOT NULL DEFAULT 0,
    chain_count INTEGER NOT NULL DEFAULT 0,
    is_finished BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_games_updated_at();

-- インデックス
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_route_id ON games(route_id);

-- 制約チェック
ALTER TABLE games ADD CONSTRAINT games_lives_check CHECK (lives >= 0 AND lives <= 5);
ALTER TABLE games ADD CONSTRAINT games_score_check CHECK (score >= 0);
ALTER TABLE games ADD CONSTRAINT games_chain_count_check CHECK (chain_count >= 0);
ALTER TABLE games ADD CONSTRAINT games_current_step_check CHECK (current_step >= 0);
