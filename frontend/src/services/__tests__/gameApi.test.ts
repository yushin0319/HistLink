import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { startGameSession, submitAnswer } from '../gameApi';
import { apiClient } from '../api';

describe('gameApi', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('startGameSession', () => {
    it('POST /game/start が成功したらセッション情報を返す', async () => {
      const mockData = {
        session_id: 'abc123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
        ],
      };

      mock.onPost('/game/start').reply(200, mockData);

      const result = await startGameSession('normal', 10);

      expect(result).toEqual(mockData);
      expect(result.session_id).toBe('abc123');
      expect(result.route_id).toBe(1);
      expect(result.current_stage).toBe(1);
    });

    it('難易度とステージ数が正しく送信される', async () => {
      const mockData = {
        session_id: 'xyz789',
        route_id: 2,
        difficulty: 'hard',
        total_stages: 50,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [],
      };

      mock.onPost('/game/start', { difficulty: 'hard', length: 50 }).reply(200, mockData);

      const result = await startGameSession('hard', 50);

      expect(result.difficulty).toBe('hard');
      expect(result.total_stages).toBe(50);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onPost('/game/start').reply(500, { error: 'Server Error' });

      await expect(startGameSession('normal', 10)).rejects.toThrow();
    });
  });

  describe('submitAnswer', () => {
    it('POST /game/answer が成功したら結果を返す', async () => {
      const mockData = {
        is_correct: true,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 100,
        next_term: {
          id: 3,
          name: '大政奉還',
          era: '近代',
          tags: ['政治'],
          description: '1867年、徳川慶喜が政権を朝廷に返上',
        },
        next_options: [
          { id: 4, name: '明治維新' },
          { id: 5, name: '廃藩置県' },
        ],
        current_stage: 2,
        is_game_over: false,
      };

      mock.onPost('/game/answer').reply(200, mockData);

      const result = await submitAnswer('abc123', 2, 100);

      expect(result).toEqual(mockData);
      expect(result.is_correct).toBe(true);
      expect(result.score_earned).toBe(100);
      expect(result.current_stage).toBe(2);
    });

    it('不正解の場合も結果を返す', async () => {
      const mockData = {
        is_correct: false,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 0,
        next_term: {
          id: 3,
          name: '大政奉還',
          era: '近代',
          tags: ['政治'],
          description: '1867年、徳川慶喜が政権を朝廷に返上',
        },
        next_options: [
          { id: 4, name: '明治維新' },
        ],
        current_stage: 2,
        is_game_over: false,
      };

      mock.onPost('/game/answer').reply(200, mockData);

      const result = await submitAnswer('abc123', 999, 0);

      expect(result.is_correct).toBe(false);
      expect(result.score_earned).toBe(0);
    });

    it('ゲームオーバーの場合はis_game_overがtrueになる', async () => {
      const mockData = {
        is_correct: false,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 0,
        next_term: null,
        next_options: [],
        current_stage: 5,
        is_game_over: true,
      };

      mock.onPost('/game/answer').reply(200, mockData);

      const result = await submitAnswer('abc123', 999, 0);

      expect(result.is_game_over).toBe(true);
      expect(result.next_term).toBeNull();
    });

    it('セッションID、回答ID、残り時間が正しく送信される', async () => {
      const mockData = {
        is_correct: true,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 75,
        next_term: null,
        next_options: [],
        current_stage: 2,
        is_game_over: false,
      };

      mock
        .onPost('/game/answer', {
          session_id: 'test-session',
          selected_term_id: 42,
          remaining_time: 75,
        })
        .reply(200, mockData);

      const result = await submitAnswer('test-session', 42, 75);

      expect(result.score_earned).toBe(75);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onPost('/game/answer').reply(400, { error: 'Invalid session' });

      await expect(submitAnswer('invalid', 1, 100)).rejects.toThrow();
    });
  });
});
