import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  GameResultResponse,
  GameUpdateRequest,
  OverallRankingResponse,
} from '../../types/api';
import { apiClient } from '../api';
import { getOverallRanking, updateGame } from '../gameApi';

describe('gameApi - updateGame / getOverallRanking', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('updateGame', () => {
    it('PATCH /games/{game_id} が成功したらゲーム情報を返す', async () => {
      const gameId = 'abc-123-def-456';
      const request: GameUpdateRequest = {
        user_name: '新しい名前',
      };

      const mockData: GameResultResponse = {
        game_id: gameId,
        difficulty: 'normal',
        total_steps: 10,
        final_score: 850,
        final_lives: 2,
        cleared_steps: 10,
        user_name: '新しい名前',
        my_rank: 3,
        rankings: [
          { rank: 1, user_name: 'トップ', score: 1000, cleared_steps: 10 },
          { rank: 2, user_name: '二位', score: 900, cleared_steps: 10 },
          { rank: 3, user_name: '新しい名前', score: 850, cleared_steps: 10 },
        ],
      };

      mock.onPatch(`/games/${gameId}`).reply(200, mockData);

      const result = await updateGame(gameId, request);

      expect(result).toEqual(mockData);
      expect(result.user_name).toBe('新しい名前');
      expect(result.my_rank).toBe(3);
    });

    it('ゲーム更新APIエラー時はエラーをthrowする', async () => {
      const gameId = 'invalid-game-id';
      const request: GameUpdateRequest = {
        user_name: 'テスト',
      };

      mock.onPatch(`/games/${gameId}`).reply(404, { error: 'Game not found' });

      await expect(updateGame(gameId, request)).rejects.toThrow();
    });
  });

  describe('getOverallRanking', () => {
    it('GET /games/rankings/overall が成功したらランキングを返す', async () => {
      const mockData: OverallRankingResponse = {
        my_rank: 5,
        rankings: [
          { rank: 1, user_name: '全体1位', score: 5000, cleared_steps: 50 },
          { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
          { rank: 3, user_name: '全体3位', score: 4000, cleared_steps: 50 },
          { rank: 4, user_name: '全体4位', score: 3500, cleared_steps: 30 },
          { rank: 5, user_name: '全体5位', score: 3000, cleared_steps: 30 },
        ],
      };

      mock.onGet('/games/rankings/overall').reply(200, mockData);

      const result = await getOverallRanking(3000);

      expect(result).toEqual(mockData);
      expect(result.my_rank).toBe(5);
      expect(result.rankings).toHaveLength(5);
    });

    it('クエリパラメータが正しく送信される', async () => {
      const mockData: OverallRankingResponse = {
        my_rank: 1,
        rankings: [
          { rank: 1, user_name: 'テスト', score: 10000, cleared_steps: 50 },
        ],
      };

      mock
        .onGet('/games/rankings/overall', { params: { my_score: 10000 } })
        .reply(200, mockData);

      const result = await getOverallRanking(10000);

      expect(result.my_rank).toBe(1);
    });

    it('全体ランキングAPIエラー時はエラーをthrowする', async () => {
      mock
        .onGet('/games/rankings/overall')
        .reply(500, { error: 'Server Error' });

      await expect(getOverallRanking(1000)).rejects.toThrow();
    });
  });
});
