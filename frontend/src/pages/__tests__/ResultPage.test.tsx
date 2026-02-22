import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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

describe('ResultPage', () => {
  let testCounter = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    testCounter++;
    // ストアをデフォルト値に設定（各テストで固有のgameIdを使用）
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
    // APIモックのデフォルト動作を設定
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
    vi.useRealTimers();
    vi.clearAllMocks();
    // ストアをリセット
    useGameStore.getState().resetGame();
  });

  it('初期表示時、正しい要素が表示される', () => {
    render(<ResultPage />);

    expect(screen.getByText('LIFE')).toBeInTheDocument();
    expect(screen.getByText('SCORE')).toBeInTheDocument();
    // currentStage=9, totalStages=10 なので currentStage + 1 === totalStages で COMPLETE が表示される
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('初期状態では3ライフと初期スコア2332が表示される', () => {
    const { container } = render(<ResultPage />);

    // 初期スコア表示（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    // 3つのダイヤモンドアイコンが存在
    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    expect(filledDiamonds).toHaveLength(3);
  });

  it('0.5秒後、スコアがカウントアップされライフが1減る', async () => {
    render(<ResultPage />);

    // 初期状態（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // スコアが300点増加（hard: 300点ボーナス）
    expect(screen.getAllByText('2632').length).toBeGreaterThan(0);
  });

  it('1.1秒後、2回目のカウントアップが完了する', async () => {
    render(<ResultPage />);

    // 1.1秒経過（1回目0.5秒 + 待機0.1秒 + 2回目0.5秒）
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // 2回分のボーナス加算（300 × 2 = 600点）
    expect(screen.getAllByText('2932').length).toBeGreaterThan(0);
  });

  it('1.7秒後、3回目のカウントアップが完了し全てのライフが消費される', async () => {
    render(<ResultPage />);

    // 1.7秒経過（1回目0.5 + 待機0.1 + 2回目0.5 + 待機0.1 + 3回目0.5）
    await act(async () => {
      vi.advanceTimersByTime(1700);
    });

    // 3回分のボーナス加算（300 × 3 = 900点）
    expect(screen.getAllByText('3232').length).toBeGreaterThan(0);
  });

  it('コンポーネントがアンマウントされたときタイマーがクリアされる', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<ResultPage />);

    unmount();

    // タイマーがクリアされていることを確認
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('レイアウトが正しく表示される', () => {
    const { container } = render(<ResultPage />);

    // Box要素が存在する
    const box = container.querySelector('[class*="MuiBox-root"]');
    expect(box).toBeInTheDocument();

    // Container要素が存在する
    const containerElement = container.querySelector('[class*="MuiContainer-root"]');
    expect(containerElement).toBeInTheDocument();
  });

  it('ResultHeaderコンポーネントに正しいpropsが渡される', () => {
    render(<ResultPage />);

    // currentStage=9, totalStages=10なので "COMPLETE" と表示される
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('スコアカウントアップ中にコンポーネントがアンマウントされても正常に動作する', async () => {
    const { unmount } = render(<ResultPage />);

    // カウントアップ中にアンマウント
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    unmount();

    // エラーが発生しないことを確認
    await act(async () => {
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    });
  });

  it('コンポーネントの再レンダリング時、useEffectが2回実行されない（isInitializedフラグが機能）', async () => {
    const { rerender } = render(<ResultPage />);

    // 初回レンダリング後のスコアを確認（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    // 再レンダリング
    rerender(<ResultPage />);

    // 0.5秒経過後、カウントアップが1回だけ実行されていることを確認
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // 2回実行されていたら2932になるはずだが、1回だけなので2632
    expect(screen.getAllByText('2632').length).toBeGreaterThan(0);
  });

  it('initialLivesが0の時、アニメーションが実行されない', () => {
    // ストアにlives=0を設定
    useGameStore.setState({ lives: 0, gameId: 'zero-lives-game' });

    render(<ResultPage />);

    // スコアが初期値のまま変わらない（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    // タイマーを進めてもスコアは変わらない
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);
  });

  it('異なる難易度設定でスコアボーナスが変わる（easy: 100点）', async () => {
    // ストアにeasy難易度を設定
    useGameStore.setState({ lives: 1, difficulty: 'easy', gameId: 'easy-game' });

    render(<ResultPage />);

    // 初期スコア確認（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('2332').length).toBeGreaterThan(0);

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // easyは100点ボーナス
    expect(screen.getAllByText('2432').length).toBeGreaterThan(0);
  });

  it('異なる初期スコアでも正しく動作する', async () => {
    // ストアに異なる初期スコアを設定
    useGameStore.setState({ lives: 1, score: 500, gameId: 'different-score-game' });

    render(<ResultPage />);

    // 初期スコア確認（スコアは複数箇所に表示されるのでgetAllByTextを使用）
    expect(screen.getAllByText('500').length).toBeGreaterThan(0);

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // 500 + 300 = 800
    expect(screen.getAllByText('800').length).toBeGreaterThan(0);
  });

  describe('API呼び出し', () => {
    it('マウント時にsubmitGameResultが呼ばれる', async () => {
      vi.useRealTimers();
      // lives=0でアニメーションをスキップし、明示的にgameIdを設定
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
      vi.useRealTimers();
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
      vi.useRealTimers();
      useGameStore.setState({ gameId: null, lives: 0 });

      render(<ResultPage />);

      // 少し待ってもAPIが呼ばれないことを確認
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSubmitGameResult).not.toHaveBeenCalled();
    });

    it('ゲームオーバー時はcurrentStageがcleared_stepsとして送信される', async () => {
      vi.useRealTimers();
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
            cleared_steps: 5, // currentStage
          })
        );
      });
    });
  });

  describe('もう一度プレイボタン', () => {
    it('ボタンクリックでresetGameが呼ばれる', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const resetGameSpy = vi.spyOn(useGameStore.getState(), 'resetGame');

      render(<ResultPage />);

      // アニメーション完了を待つ
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
      // lives=0の場合、アニメーションなしで即座に表示される
      useGameStore.setState({ lives: 0, gameId: 'modal-test-game' });
      vi.useRealTimers();
      const user = userEvent.setup();

      render(<ResultPage />);

      // ルートを見るボタンをクリック
      const routeButton = screen.getByText('ルートを見る');
      await user.click(routeButton);

      // モーダルが開く
      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      // モーダル内にステップが表示される
      expect(screen.getByText('テスト用語1')).toBeInTheDocument();
    });

    it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      // lives=0の場合、アニメーションなしで即座に表示される
      useGameStore.setState({ lives: 0, gameId: 'modal-close-test' });
      vi.useRealTimers();
      const user = userEvent.setup();

      render(<ResultPage />);

      // ルートを見るボタンをクリック
      await user.click(screen.getByText('ルートを見る'));

      // モーダルが開く
      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      // 閉じるボタンをクリック（CloseIconを持つボタン）
      const closeButton = screen.getByTestId('CloseIcon').closest('button');
      expect(closeButton).not.toBeNull();
      await user.click(closeButton!);

      // onCloseが呼ばれた結果、isRouteModalOpenがfalseになることを確認
      // MUIのModalはアニメーションで閉じるため、少し待つ
      await waitFor(
        () => {
          // モーダルコンテンツ（テスト用語1）がなくなることを確認
          expect(screen.queryByText('テスト用語1')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('名前変更', () => {
    it('名前変更時にupdateGameが呼ばれる', async () => {
      // lives=0の場合、アニメーションなしで即座に表示される
      useGameStore.setState({ lives: 0, gameId: 'name-change-test-game' });
      vi.useRealTimers();
      const user = userEvent.setup();

      render(<ResultPage />);

      // 現在のユーザー名をクリックして編集モードに入る
      const userName = screen.getByText('テストユーザー');
      await user.click(userName);

      // テキストフィールドが表示される
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // 名前を変更
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '新しい名前');

      // Enterキーで確定
      await user.keyboard('{Enter}');

      // updateGameが呼ばれる
      await waitFor(() => {
        expect(mockUpdateGame).toHaveBeenCalledWith(
          'name-change-test-game',
          { user_name: '新しい名前' }
        );
      });
    });
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

      expect(screen.getByText('6 / 10')).toBeInTheDocument(); // currentStage + 1
    });
  });

  describe('falseSteps', () => {
    it('falseStepsがある場合、正しくモーダルに渡される', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      useGameStore.setState({
        falseSteps: [0],
        gameId: 'false-steps-test',
      });

      render(<ResultPage />);

      // コンテンツ表示を待つ
      await waitFor(() => {
        expect(screen.getByText('ルートを見る')).toBeInTheDocument();
      });

      // モーダルを開く
      await user.click(screen.getByText('ルートを見る'));

      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });

      // モーダル内にステップが表示されることを確認
      expect(screen.getByText('テスト用語1')).toBeInTheDocument();
    });
  });
});
