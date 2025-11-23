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

export interface Choice {
  term_id: number;
  name: string;
  era: string;
}

export interface RouteStepWithChoices {
  step_no: number;
  term: Term;
  correct_next_id: number | null;
  choices: Choice[];
  relation_type: string;
  relation_description: string;
}

export interface GameStartResponse {
  game_id: string;
  route_id: number;
  difficulty: string;
  total_steps: number;
  steps: RouteStepWithChoices[];
  created_at: string;
}

export interface GameResultRequest {
  final_score: number;
  final_lives: number;
  is_completed: boolean;
}

export interface GameResultResponse {
  game_id: string;
  final_score: number;
  final_lives: number;
  is_completed: boolean;
  message: string;
}
