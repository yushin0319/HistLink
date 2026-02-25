import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultPage from '../ResultPage';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../services/gameApi';
import type { RouteStepWithChoices } from '../../types/api';

// gameApi をモック
vi.mock('../../services/gameApi', () => ({
  submitGameResult: vi.fn(),
  updateGame: vi.fn(),
  getOverallRanking: vi.fn(),
}));

const mockSubmitGameResult = vi.mocked(gameApi.submitGameResult);
const mockUpdateGame = vi.mocked(gameApi.updateGame);
const mockGetOverallRanking = vi.mocked(gameApi.getOverallRanking);

// モックデータ
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: { id: 1, name: 'テスト用語1', tier: 1, category: '時代1', description: '' },
    correct_next_id: 2,
    choices: [],
    difficulty: 'easy',
    keyword: 'キーワード1',
    edge_description: '説明1',
  },
  {
    step_no: 1,
    term: { id: 2, name: 'テスト用語2', tier: 1, category: '時代2', description: '' },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('ResultPage API・操作', () => {
  let testCounter = 100; // display側と衝突しないようにオフセット

  beforeEach(() => {
    testCounter++;
    useGameStore.setState({
      lives: 3,
      score: 2332,
      difficulty: 'hard',
      currentStage: 9,
      totalStages: 10,
      steps: mockSteps,
      gameId: `test-game-id-${testCounter}`,
      falseSteps: [],
      playerName: 'テストユーザー',
      myRank: 1,
      rankings: [
        { rank: 1, user_name: 'テストユーザー', score: 2332, cleared_steps: 10 },
        { rank: 2, user_name: 'たろう', score: 2000, cleared_steps: 10 },
      ],
      overallMyRank: 1,
      overallRankings: [
        { rank: 1, user_name: 'テストユーザー', score: 5000, cleared_steps: 50 },
        { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
      ],
    });
    mockSubmitGameResult.mockResolvedValue({
      game_id: `test-game-id-${testCounter}`,
      difficulty: 'hard',
      total_steps: 10,
      final_score: 2332,
      final_lives: 3,
      cleared_steps: 10,
      user_name: 'テストユーザー',
      my_rank: 1,
      rankings: [
        { rank: 1, user_name: 'テストユーザー', score: 2332, cleared_steps: 10 },
      ],
    });
    mockUpdateGame.mockResolvedValue({
      game_id: `test-game-id-${testCounter}`,
      difficulty: 'hard',
      total_steps: 10,
      final_score: 2332,
      final_lives: 3,
      cleared_steps: 10,
      user_name: '新しい名前',
      my_rank: 1,
      rankings: [
        { rank: 1, user_name: '新しい名前', score: 2332, cleared_steps: 10 },
      ],
    });
    mockGetOverallRanking.mockResolvedValue({
      my_rank: 1,
      rankings: [
        { rank: 1, user_name: 'テストユーザー', score: 5000, cleared_steps: 50 },
        { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
  });

  describe('API呼び出し', () => {
    it('マウント時にsubmitGameResultが呼ばれる', async () => {
      useGameStore.setState({
        lives: 0,
        gameId: 'submit-test-game',
        isCompleted: true,
      });

      render(<ResultPage />);

      await waitFor(() => {
        expect(mockSubmitGameResult).toHaveBeenCalledWith(
          'submit-test-game',
          expect.objectContaining({
            base_score: 2332,
            final_lives: 0,
            user_name: 'テストユーザー',
            false_steps: [],
          })
        );
      });
    });

    it('submitGameResultエラー時でもクラッシュしない', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSubmitGameResult.mockRejectedValueOnce(new Error('API Error'));
      useGameStore.setState({ lives: 0, gameId: 'error-test-game' });

      expect(() => render(<ResultPage />)).not.toThrow();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('結果送信エラー:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('gameIdがnullの場合、submitGameResultは呼ばれない', async () => {
      useGameStore.setState({ gameId: null, lives: 0 });

      render(<ResultPage />);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSubmitGameResult).not.toHaveBeenCalled();
    });

    it('ゲームオーバー時はcurrentStageがcleared_stepsとして送信される', async () => {
      useGameStore.setState({
        lives: 0,
        currentStage: 5,
        totalStages: 10,
        isCompleted: false,
        gameId: 'game-over-test',
      });

      render(<ResultPage />);

      await waitFor(() => {
        expect(mockSubmitGameResult).toHaveBeenCalledWith(
          'game-over-test',
          expect.objectContaining({
            cleared_steps: 5,
          })
        );
      });
    });
  });

  describe('もう一度プレイボタン', () => {
    it('ボタンクリックでresetGameが呼ばれる', async () => {
      const user = userEvent.setup();
      const resetGameSpy = vi.spyOn(useGameStore.getState(), 'resetGame');

      render(<ResultPage />);

      await waitFor(() => {
        expect(screen.getByText('もう一度プレイ')).toBeInTheDocument();
      });

      const button = screen.getByText('もう一度プレイ');
      await user.click(button);

      expect(resetGameSpy).toHaveBeenCalled();
    });
  });

  describe('ルートおさらいモーダル', () => {
    it('ルートを見るボタンでモーダルが開き、ステップが表示される', async () => {
      useGameStore.setState({ lives: 0, gameId: 'modal-test-game' });
      const user = userEvent.setup();

      render(<ResultPage />);

      const routeButton = screen.getByText('ルートを見る');
      await user.click(routeButton);

      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      expect(screen.getByText('テスト用語1')).toBeInTheDocument();
    });

    it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      useGameStore.setState({ lives: 0, gameId: 'modal-close-test' });
      const user = userEvent.setup();

      render(<ResultPage />);

      await user.click(screen.getByText('ルートを見る'));

      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('CloseIcon').closest('button');
      expect(closeButton).not.toBeNull();
      await user.click(closeButton!);

      await waitFor(
        () => {
          expect(screen.queryByText('テスト用語1')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('名前変更', () => {
    it('名前変更時にupdateGameが呼ばれる', async () => {
      useGameStore.setState({ lives: 0, gameId: 'name-change-test-game' });
      const user = userEvent.setup();

      render(<ResultPage />);

      const userName = screen.getByText('テストユーザー');
      await user.click(userName);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '新しい名前');

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockUpdateGame).toHaveBeenCalledWith(
          'name-change-test-game',
          { user_name: '新しい名前' }
        );
      });
    });
  });

  describe('falseSteps', () => {
    it('falseStepsがある場合、正しくモーダルに渡される', async () => {
      const user = userEvent.setup();

      useGameStore.setState({
        falseSteps: [0],
        gameId: 'false-steps-test',
      });

      render(<ResultPage />);

      await waitFor(() => {
        expect(screen.getByText('ルートを見る')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ルートを見る'));

      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      expect(screen.getByText('テスト用語1')).toBeInTheDocument();
    });
  });
});
