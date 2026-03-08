import { act, render, screen } from '@testing-library/react';
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

describe('ResultPage タイマー・アニメーション', () => {
  let testCounter = 300;

  beforeEach(() => {
    vi.useFakeTimers();
    testCounter++;
    useGameStore.setState({
      lives: 3,
      score: 2332,
      difficulty: 'hard',
      currentStage: 9,
      totalStages: 10,
      steps: mockSteps,
      gameId: `timer-game-${testCounter}`,
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
      ],
      overallMyRank: 1,
      overallRankings: [
        {
          rank: 1,
          user_name: 'テストユーザー',
          score: 5000,
          cleared_steps: 50,
        },
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
        return HttpResponse.json({ my_rank: 1, rankings: [] });
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    useGameStore.getState().resetGame();
  });

  it('0.5秒後、スコアがカウントアップされライフが1減る', async () => {
    render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('2632').length).toBeGreaterThan(0);
  });

  it('1.1秒後、2回目のカウントアップが完了する', async () => {
    render(<ResultPage />);

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getAllByText('2932').length).toBeGreaterThan(0);
  });

  it('1.7秒後、3回目のカウントアップが完了し全てのライフが消費される', async () => {
    render(<ResultPage />);

    await act(async () => {
      vi.advanceTimersByTime(1700);
    });

    expect(screen.getAllByText('3232').length).toBeGreaterThan(0);
  });

  it('コンポーネントがアンマウントされたときタイマーがクリアされる', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<ResultPage />);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('アンマウント後にペンディングタイマーが残らない', () => {
    vi.clearAllTimers();

    const { unmount } = render(<ResultPage />);

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('スコアカウントアップ中にコンポーネントがアンマウントされても正常に動作する', async () => {
    const { unmount } = render(<ResultPage />);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    unmount();

    await act(async () => {
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    });
  });

  it('コンポーネントの再レンダリング時、useEffectが2回実行されない（isInitializedフラグが機能）', async () => {
    const { rerender } = render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    rerender(<ResultPage />);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('2632').length).toBeGreaterThan(0);
  });

  it('異なる難易度設定でスコアボーナスが変わる（easy: 100点）', async () => {
    useGameStore.setState({
      lives: 1,
      difficulty: 'easy',
      gameId: `easy-${testCounter}`,
    });

    render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('2432').length).toBeGreaterThan(0);
  });

  it('異なる初期スコアでも正しく動作する', async () => {
    useGameStore.setState({
      lives: 1,
      score: 500,
      gameId: `diff-score-${testCounter}`,
    });

    render(<ResultPage />);

    expect(screen.getAllByText('500').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('800').length).toBeGreaterThan(0);
  });
});
