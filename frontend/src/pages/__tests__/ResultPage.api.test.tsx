import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const mockResultResponse = (gameId: string) => ({
  game_id: gameId,
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

const mockOverallRankingResponse = {
  my_rank: 1,
  rankings: [
    { rank: 1, user_name: 'テストユーザー', score: 5000, cleared_steps: 50 },
    { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
  ],
};

describe('ResultPage API・操作', () => {
  let testCounter = 100;

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

    // デフォルトの成功レスポンスを設定
    server.use(
      http.post(`${API_BASE}/games/:gameId/result`, ({ params }) => {
        return HttpResponse.json(mockResultResponse(params.gameId as string));
      }),
      http.get(`${API_BASE}/games/rankings/overall`, () => {
        return HttpResponse.json(mockOverallRankingResponse);
      }),
      http.patch(`${API_BASE}/games/:gameId`, ({ params }) => {
        return HttpResponse.json({
          ...mockResultResponse(params.gameId as string),
          user_name: '新しい名前',
        });
      }),
    );
  });

  afterEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('API呼び出し', () => {
    it('マウント時にsubmitGameResultが呼ばれる', async () => {
      useGameStore.setState({
        lives: 0,
        gameId: 'submit-test-game',
        isCompleted: true,
      });
      let capturedBody: Record<string, unknown> | undefined;
      server.use(
        http.post(
          `${API_BASE}/games/submit-test-game/result`,
          async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json(mockResultResponse('submit-test-game'));
          },
        ),
      );

      render(<ResultPage />);

      await waitFor(() => {
        expect(capturedBody).toMatchObject({
          base_score: 2332,
          final_lives: 0,
          user_name: 'テストユーザー',
          false_steps: [],
        });
      });
    });

    it('submitGameResultエラー時でもクラッシュしない', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      useGameStore.setState({ lives: 0, gameId: 'error-test-game' });
      server.use(
        http.post(`${API_BASE}/games/error-test-game/result`, () => {
          return HttpResponse.json({ error: 'API Error' }, { status: 500 });
        }),
      );

      expect(() => render(<ResultPage />)).not.toThrow();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '結果送信エラー:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('gameIdがnullの場合、submitGameResultは呼ばれない', async () => {
      useGameStore.setState({ gameId: null, lives: 0 });
      let requestMade = false;
      server.use(
        http.post(`${API_BASE}/games/:gameId/result`, () => {
          requestMade = true;
          return HttpResponse.json({});
        }),
      );

      render(<ResultPage />);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(requestMade).toBe(false);
    });

    it('ゲームオーバー時はcurrentStageがcleared_stepsとして送信される', async () => {
      useGameStore.setState({
        lives: 0,
        currentStage: 5,
        totalStages: 10,
        isCompleted: false,
        gameId: 'game-over-test',
      });
      let capturedBody: Record<string, unknown> | undefined;
      server.use(
        http.post(
          `${API_BASE}/games/game-over-test/result`,
          async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json(mockResultResponse('game-over-test'));
          },
        ),
      );

      render(<ResultPage />);

      await waitFor(() => {
        expect(capturedBody).toMatchObject({ cleared_steps: 5 });
      });
    });
  });

  describe('名前変更', () => {
    it('名前変更時にupdateGameが呼ばれる', async () => {
      useGameStore.setState({ lives: 0, gameId: 'name-change-test-game' });
      const user = userEvent.setup();
      let capturedBody: Record<string, unknown> | undefined;
      server.use(
        http.patch(
          `${API_BASE}/games/name-change-test-game`,
          async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({
              ...mockResultResponse('name-change-test-game'),
              user_name: '新しい名前',
            });
          },
        ),
      );

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
        expect(capturedBody).toMatchObject({ user_name: '新しい名前' });
      });
    });
  });
});
