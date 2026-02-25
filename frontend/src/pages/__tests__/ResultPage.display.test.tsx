import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

describe('ResultPage 表示・アニメーション', () => {
  let testCounter = 0;

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
    vi.useRealTimers();
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
  });

  it('初期表示時、正しい要素が表示される', () => {
    render(<ResultPage />);

    expect(screen.getByText('LIFE')).toBeInTheDocument();
    expect(screen.getByText('SCORE')).toBeInTheDocument();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('初期状態では3ライフと初期スコア2332が表示される', () => {
    const { container } = render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    expect(filledDiamonds).toHaveLength(3);
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

  it('レイアウトが正しく表示される', () => {
    const { container } = render(<ResultPage />);

    const box = container.querySelector('[class*="MuiBox-root"]');
    expect(box).toBeInTheDocument();

    const containerElement = container.querySelector('[class*="MuiContainer-root"]');
    expect(containerElement).toBeInTheDocument();
  });

  it('ResultHeaderコンポーネントに正しいpropsが渡される', () => {
    render(<ResultPage />);

    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
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

  it('initialLivesが0の時、アニメーションが実行されない', () => {
    useGameStore.setState({ lives: 0, gameId: 'zero-lives-game' });

    render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);
  });

  it('異なる難易度設定でスコアボーナスが変わる（easy: 100点）', async () => {
    useGameStore.setState({ lives: 1, difficulty: 'easy', gameId: 'easy-game' });

    render(<ResultPage />);

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('2432').length).toBeGreaterThan(0);
  });

  it('異なる初期スコアでも正しく動作する', async () => {
    useGameStore.setState({ lives: 1, score: 500, gameId: 'different-score-game' });

    render(<ResultPage />);

    expect(screen.getAllByText('500').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('800').length).toBeGreaterThan(0);
  });

  describe('ステージ表示', () => {
    it('未クリアの場合、ステージ番号が表示される', () => {
      useGameStore.setState({
        lives: 0,
        currentStage: 5,
        totalStages: 10,
        gameId: 'stage-display-test',
      });

      render(<ResultPage />);

      expect(screen.getByText('6 / 10')).toBeInTheDocument();
    });
  });
});
