import { apiClient } from './api';
import type { GameStartResponse, GameAnswerResponse } from '../types/api';

/**
 * ゲームセッションを開始
 */
export async function startGameSession(
  difficulty: string,
  length: number
): Promise<GameStartResponse> {
  const response = await apiClient.post<GameStartResponse>('/game/start', {
    difficulty,
    length,
  });
  return response.data;
}

/**
 * 回答を送信
 */
export async function submitAnswer(
  sessionId: string,
  selectedTermId: number,
  remainingTime: number
): Promise<GameAnswerResponse> {
  const response = await apiClient.post<GameAnswerResponse>('/game/answer', {
    session_id: sessionId,
    selected_term_id: selectedTermId,
    remaining_time: remainingTime,
  });
  return response.data;
}
