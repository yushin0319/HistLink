import { apiClient } from './api';
import type { GameStartResponse, GameResultRequest, GameResultResponse } from '../types/api';

/**
 * ゲームセッションを開始（全ルート+選択肢を一括取得）
 */
export async function startGameSession(
  difficulty: string,
  length: number
): Promise<GameStartResponse> {
  const response = await apiClient.post<GameStartResponse>('/games/start', {
    difficulty,
    target_length: length,
  });
  return response.data;
}

/**
 * ゲーム結果を送信
 */
export async function submitGameResult(
  gameId: string,
  result: GameResultRequest
): Promise<GameResultResponse> {
  const response = await apiClient.post<GameResultResponse>(`/games/${gameId}/result`, result);
  return response.data;
}
