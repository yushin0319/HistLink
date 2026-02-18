export interface Term {
  id: number;
  name: string;
  tier: number;
  category: string;
  description: string;
}

export interface Choice {
  term_id: number;
  name: string;
  tier: number;
}

export interface RouteStepWithChoices {
  step_no: number;
  term: Term;
  correct_next_id: number | null;
  choices: Choice[];
  difficulty: string;  // エッジの難易度（easy/normal/hard）
  keyword: string;
  edge_description: string;
}

export interface GameStartResponse {
  game_id: string;
  difficulty: string;
  total_steps: number;
  steps: RouteStepWithChoices[];
  created_at: string;
}

export interface GameResultRequest {
  base_score: number;  // タイマーベースの素点（ライフボーナス含まない）
  final_lives: number;
  cleared_steps: number;
  user_name?: string;  // デフォルト: "GUEST"
  false_steps?: number[];  // 間違えたステージのインデックス配列
}

export interface RankingEntry {
  rank: number;
  user_name: string;
  score: number;
  cleared_steps: number;
}

export interface GameResultResponse {
  game_id: string;
  difficulty: string;
  total_steps: number;
  final_score: number;
  final_lives: number;
  cleared_steps: number;
  user_name: string;
  my_rank: number;
  rankings: RankingEntry[];
}

export interface GameUpdateRequest {
  user_name: string;
}

export interface OverallRankingResponse {
  my_rank: number;
  rankings: RankingEntry[];
}
