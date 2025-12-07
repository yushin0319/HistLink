import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { startGameSession, submitGameResult, updateGame, getOverallRanking } from '../gameApi';
import { apiClient } from '../api';
import type { GameStartResponse, GameResultRequest, GameResultResponse, GameUpdateRequest, OverallRankingResponse } from '../../types/api';

describe('gameApi', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('startGameSession', () => {
    it('POST /games/start が成功したら全ルート+選択肢を返す', async () => {
      const mockData: GameStartResponse = {
        game_id: 'abc-123-def-456',
        route_id: 1,
        difficulty: 'standard',
        total_steps: 3,
        steps: [
          {
            step_no: 0,
            term: {
              id: 1,
              name: 'ペリー来航',
              tier: 1,
              category: '近代',
              description: '1853年、アメリカのペリー提督が浦賀に来航',
            },
            correct_next_id: 2,
            choices: [
              { term_id: 2, name: '日米修好通商条約', tier: 1 },
              { term_id: 3, name: '大政奉還', tier: 1 },
              { term_id: 4, name: '明治維新', tier: 1 },
              { term_id: 5, name: '版籍奉還', tier: 1 },
            ],
            difficulty: 'easy',
            keyword: '開国',
            edge_description: 'ペリー来航により日本は開国へと向かった',
          },
          {
            step_no: 1,
            term: {
              id: 2,
              name: '日米修好通商条約',
              tier: 1,
              category: '近代',
              description: '1858年に結ばれた不平等条約',
            },
            correct_next_id: 3,
            choices: [
              { term_id: 3, name: '大政奉還', tier: 1 },
              { term_id: 4, name: '明治維新', tier: 1 },
              { term_id: 6, name: '廃藩置県', tier: 1 },
              { term_id: 7, name: '岩倉使節団', tier: 1 },
            ],
            difficulty: 'normal',
            keyword: '不平等条約',
            edge_description: '不平等条約の改正が明治政府の課題となった',
          },
          {
            step_no: 2,
            term: {
              id: 3,
              name: '大政奉還',
              tier: 1,
              category: '近代',
              description: '1867年、徳川慶喜が政権を朝廷に返上',
            },
            correct_next_id: null,
            choices: [],
            difficulty: '',
            keyword: '',
            edge_description: '',
          },
        ],
        created_at: '2025-11-23T10:00:00Z',
      };

      mock.onPost('/games/start').reply(200, mockData);

      const result = await startGameSession('standard', 30);

      expect(result).toEqual(mockData);
      expect(result.game_id).toBe('abc-123-def-456');
      expect(result.route_id).toBe(1);
      expect(result.total_steps).toBe(3);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].choices).toHaveLength(4);
      expect(result.steps[2].choices).toHaveLength(0);
    });

    it('難易度とステージ数が正しく送信される', async () => {
      const mockData: GameStartResponse = {
        game_id: 'xyz-789-uvw-012',
        route_id: 2,
        difficulty: 'hard',
        total_steps: 50,
        steps: [],
        created_at: '2025-11-23T10:00:00Z',
      };

      mock.onPost('/games/start', { difficulty: 'hard', target_length: 50 }).reply(200, mockData);

      const result = await startGameSession('hard', 50);

      expect(result.difficulty).toBe('hard');
      expect(result.total_steps).toBe(50);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onPost('/games/start').reply(500, { error: 'Server Error' });

      await expect(startGameSession('standard', 30)).rejects.toThrow();
    });
  });

  describe('submitGameResult', () => {
    it('POST /games/{game_id}/result が成功したら結果を返す', async () => {
      const gameId = 'abc-123-def-456';
      const request: GameResultRequest = {
        final_score: 850,
        final_lives: 2,
        is_completed: true,
      };

      const mockData: GameResultResponse = {
        game_id: gameId,
        final_score: 850,
        final_lives: 2,
        is_completed: true,
        message: 'ゲームクリア！最終スコア: 850点',
      };

      mock.onPost(`/games/${gameId}/result`).reply(200, mockData);

      const result = await submitGameResult(gameId, request);

      expect(result).toEqual(mockData);
      expect(result.final_score).toBe(850);
      expect(result.is_completed).toBe(true);
      expect(result.message).toContain('ゲームクリア');
    });

    it('ゲームオーバーの場合のメッセージが返る', async () => {
      const gameId = 'xyz-789-uvw-012';
      const request: GameResultRequest = {
        final_score: 420,
        final_lives: 0,
        is_completed: false,
      };

      const mockData: GameResultResponse = {
        game_id: gameId,
        final_score: 420,
        final_lives: 0,
        is_completed: false,
        message: 'ゲームオーバー。最終スコア: 420点',
      };

      mock.onPost(`/games/${gameId}/result`).reply(200, mockData);

      const result = await submitGameResult(gameId, request);

      expect(result.is_completed).toBe(false);
      expect(result.final_lives).toBe(0);
      expect(result.message).toContain('ゲームオーバー');
    });

    it('リクエストボディが正しく送信される', async () => {
      const gameId = 'test-game-id';
      const request: GameResultRequest = {
        final_score: 500,
        final_lives: 1,
        is_completed: true,
      };

      const mockData: GameResultResponse = {
        game_id: gameId,
        final_score: 500,
        final_lives: 1,
        is_completed: true,
        message: 'ゲームクリア！最終スコア: 500点',
      };

      mock
        .onPost(`/games/${gameId}/result`, request)
        .reply(200, mockData);

      const result = await submitGameResult(gameId, request);

      expect(result.final_score).toBe(500);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      const gameId = 'invalid-game-id';
      const request: GameResultRequest = {
        final_score: 0,
        final_lives: 3,
        is_completed: false,
      };

      mock.onPost(`/games/${gameId}/result`).reply(404, { error: 'Game not found' });

      await expect(submitGameResult(gameId, request)).rejects.toThrow();
    });
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

    it('APIエラー時はエラーをthrowする', async () => {
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

      mock.onGet('/games/rankings/overall', { params: { my_score: 10000 } }).reply(200, mockData);

      const result = await getOverallRanking(10000);

      expect(result.my_rank).toBe(1);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onGet('/games/rankings/overall').reply(500, { error: 'Server Error' });

      await expect(getOverallRanking(1000)).rejects.toThrow();
    });
  });
});
