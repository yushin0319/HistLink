import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { useGameStore } from '../../stores/gameStore';
import type { RouteStepWithChoices } from '../../types/api';
import ResultPage from '../ResultPage';

const API_BASE = 'http://localhost:8000/api/v1';

const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: {
      id: 1,
      name: 'テスト用語1',
      tier: 1,
      category: '時代1',
      description: '',
    },
    correct_next_id: 2,
    choices: [],
    difficulty: 'easy',
    keyword: 'キーワード1',
    edge_description: '説明1',
  },
  {
    step_no: 1,
    term: {
      id: 2,
      name: 'テスト用語2',
      tier: 1,
      category: '時代2',
      description: '',
    },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('ResultPage インタラクション', () => {
  let testCounter = 200;

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
        {
          rank: 1,
          user_name: 'テストユーザー',
          score: 2332,
          cleared_steps: 10,
        },
        { rank: 2, user_name: 'たろう', score: 2000, cleared_steps: 10 },
      ],
      overallMyRank: 1,
      overallRankings: [
        {
          rank: 1,
          user_name: 'テストユーザー',
          score: 5000,
          cleared_steps: 50,
        },
        { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
      ],
    });

    server.use(
      http.post(`${API_BASE}/games/:gameId/result`, ({ params }) => {
        return HttpResponse.json({
          game_id: params.gameId,
          difficulty: 'hard',
          total_steps: 10,
          final_score: 2332,
          final_lives: 3,
          cleared_steps: 10,
          user_name: 'テストユーザー',
          my_rank: 1,
          rankings: [
            {
              rank: 1,
              user_name: 'テストユーザー',
              score: 2332,
              cleared_steps: 10,
            },
          ],
        });
      }),
      http.get(`${API_BASE}/games/rankings/overall`, () => {
        return HttpResponse.json({
          my_rank: 1,
          rankings: [
            {
              rank: 1,
              user_name: 'テストユーザー',
              score: 5000,
              cleared_steps: 50,
            },
          ],
        });
      }),
    );
  });

  afterEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('もう一度プレイボタン', () => {
    it('ボタンクリックでresetGameが呼ばれる', async () => {
      const user = userEvent.setup();

      render(<ResultPage />);

      await waitFor(() => {
        expect(screen.getByText('もう一度プレイ')).toBeInTheDocument();
      });

      const initialGameId = useGameStore.getState().gameId;
      const button = screen.getByText('もう一度プレイ');
      await user.click(button);

      // resetGame後にgameIdはnullになる
      expect(useGameStore.getState().gameId).not.toBe(initialGameId);
    });
  });

  describe('ルートおさらいモーダル', () => {
    it('ルートを見るボタンでモーダルが開き、ステップが表示される', async () => {
      useGameStore.setState({ lives: 0, gameId: `modal-test-${testCounter}` });
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
      useGameStore.setState({ lives: 0, gameId: `modal-close-${testCounter}` });
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
        { timeout: 2000 },
      );
    });
  });

  describe('falseSteps', () => {
    it('falseStepsがある場合、正しくモーダルに渡される', async () => {
      const user = userEvent.setup();
      useGameStore.setState({
        falseSteps: [0],
        gameId: `false-steps-${testCounter}`,
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
