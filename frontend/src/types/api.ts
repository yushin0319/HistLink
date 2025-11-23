export interface Term {
  id: number;
  name: string;
  era: string;
  tags: string[];
  description: string;
}

export interface Route {
  id: number;
  start_term_id: number;
  length: number;
  difficulty: string;
  start_term?: Term;
}

export interface RoutesResponse {
  routes: Route[];
  total: number;
}

export interface RouteStep {
  step_no: number;
  term: Term;
  relation_type?: string;
}

export interface RouteStepsResponse {
  route_id: number;
  steps: RouteStep[];
  total_steps: number;
}

export interface TermOption {
  id: number;
  name: string;
}

export interface GameStartResponse {
  session_id: string;
  route_id: number;
  difficulty: string;
  total_stages: number;
  current_stage: number;
  current_term: Term;
  options: TermOption[];
}

export interface GameAnswerResponse {
  is_correct: boolean;
  correct_term: Term;
  score_earned: number;
  next_term: Term | null;
  next_options: TermOption[];
  current_stage: number;
  is_game_over: boolean;
}
