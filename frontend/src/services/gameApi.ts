import { apiClient } from './api';
import type {
  GameStartResponse,
  GameResultRequest,
  GameResultResponse,
  GameUpdateRequest,
  OverallRankingResponse,
} from '../types/api';

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

/**
 * ゲーム情報を更新（ユーザー名変更用）
 */
export async function updateGame(
  gameId: string,
  request: GameUpdateRequest
): Promise<GameResultResponse> {
  const response = await apiClient.patch<GameResultResponse>(`/games/${gameId}`, request);
  return response.data;
}

/**
 * 全体ランキングを取得
 */
export async function getOverallRanking(
  myScore: number
): Promise<OverallRankingResponse> {
  const response = await apiClient.get<OverallRankingResponse>('/games/rankings/overall', {
    params: { my_score: myScore },
  });
  return response.data;
}
