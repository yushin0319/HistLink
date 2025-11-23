import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GamePage from '../GamePage';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../services/gameApi';
import type { GameStartResponse, RouteStepWithChoices } from '../../types/api';

// gameApi のモック
vi.mock('../../services/gameApi');

// モックデータ: 3ステップのルート
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: { id: 1, name: '邪馬台国', era: '弥生時代', tags: [], description: '卑弥呼が治めた国' },
    correct_next_id: 2,
    choices: [
      { term_id: 2, name: '卑弥呼', era: '弥生時代' },
      { term_id: 3, name: '聖徳太子', era: '飛鳥時代' },
      { term_id: 4, name: '中大兄皇子', era: '飛鳥時代' },
      { term_id: 5, name: '藤原道長', era: '平安時代' },
    ],
  },
  {
    step_no: 1,
    term: { id: 2, name: '卑弥呼', era: '弥生時代', tags: [], description: '邪馬台国の女王' },
    correct_next_id: 6,
    choices: [
      { term_id: 6, name: '大化の改新', era: '飛鳥時代' },
      { term_id: 7, name: '壬申の乱', era: '飛鳥時代' },
      { term_id: 8, name: '平城京', era: '奈良時代' },
      { term_id: 9, name: '平安京', era: '平安時代' },
    ],
  },
  {
    step_no: 2,
    term: { id: 6, name: '大化の改新', era: '飛鳥時代', tags: [], description: '645年の政治改革' },
    correct_next_id: null,
    choices: [],
  },
];

const mockGameStartResponse: GameStartResponse = {
  game_id: 'test-game-id',
  route_id: 123,
  difficulty: 'normal',
  total_steps: 3,
  steps: mockSteps,
  created_at: '2025-01-01T00:00:00Z',
};

describe('GamePage', () => {
  let mockStartGameSession: ReturnType<typeof vi.fn>;
  let mockSubmitGameResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // gameStoreをリセット
    useGameStore.getState().resetGame();

    mockStartGameSession = vi.fn();
    mockSubmitGameResult = vi.fn();

    vi.mocked(gameApi.startGameSession).mockImplementation(mockStartGameSession);
    vi.mocked(gameApi.submitGameResult).mockImplementation(mockSubmitGameResult);
  });

  describe('初期レンダリング', () => {
    it('ローディング状態が表示される', () => {
      mockStartGameSession.mockReturnValue(new Promise(() => {})); // 永遠に解決しないPromise

      render(<GamePage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('ゲーム開始時、startGameSessionが呼ばれる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      // API呼び出し確認
      await screen.findByText('邪馬台国');

      expect(mockStartGameSession).toHaveBeenCalledWith('normal', 10);
      expect(mockStartGameSession).toHaveBeenCalledTimes(1);
    });

    it('ゲーム情報が表示される', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      expect(screen.getByText('ライフ: 3')).toBeInTheDocument();
      expect(screen.getByText('スコア: 0')).toBeInTheDocument();
      // totalStagesは初期値10（loadGameDataでsteps.lengthに更新されるが、startGameで10を使用）
      expect(screen.getByText('ステージ: 1 / 10')).toBeInTheDocument();
    });

    it('最初のステップが表示される', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      expect(screen.getByText('卑弥呼が治めた国')).toBeInTheDocument();
      expect(screen.getByText('卑弥呼')).toBeInTheDocument();
      expect(screen.getByText('聖徳太子')).toBeInTheDocument();
      expect(screen.getByText('中大兄皇子')).toBeInTheDocument();
      expect(screen.getByText('藤原道長')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('API失敗時にエラーメッセージが表示される', async () => {
      mockStartGameSession.mockRejectedValue(new Error('Network Error'));

      render(<GamePage />);

      await screen.findByText(/エラーが発生しました/);

      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });
});
