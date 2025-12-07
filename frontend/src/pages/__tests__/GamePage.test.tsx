import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    term: { id: 1, name: '邪馬台国', tier: 1, category: '弥生時代', description: '卑弥呼が治めた国' },
    correct_next_id: 2,
    choices: [
      { term_id: 2, name: '卑弥呼', tier: 1 },
      { term_id: 3, name: '聖徳太子', tier: 1 },
      { term_id: 4, name: '中大兄皇子', tier: 1 },
      { term_id: 5, name: '藤原道長', tier: 1 },
    ],
    difficulty: 'easy',
    keyword: '女王卑弥呼',
    edge_description: '邪馬台国を統治した女王',
  },
  {
    step_no: 1,
    term: { id: 2, name: '卑弥呼', tier: 1, category: '弥生時代', description: '邪馬台国の女王' },
    correct_next_id: 6,
    choices: [
      { term_id: 6, name: '大化の改新', tier: 1 },
      { term_id: 7, name: '壬申の乱', tier: 1 },
      { term_id: 8, name: '平城京', tier: 1 },
      { term_id: 9, name: '平安京', tier: 1 },
    ],
    difficulty: 'normal',
    keyword: '律令制度',
    edge_description: '大化の改新により律令制度が導入された',
  },
  {
    step_no: 2,
    term: { id: 6, name: '大化の改新', tier: 1, category: '飛鳥時代', description: '645年の政治改革' },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
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
      // StrictModeで2回呼ばれる可能性があるため、少なくとも1回呼ばれたことを確認
      expect(mockStartGameSession).toHaveBeenCalled();
    });

    it('ゲーム情報が表示される', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // GameHeaderの英語ラベルを確認
      expect(screen.getByText('LIFE')).toBeInTheDocument();
      expect(screen.getByText('SCORE')).toBeInTheDocument();
      expect(screen.getByText('STAGE')).toBeInTheDocument();
      expect(screen.getByText('TIMER')).toBeInTheDocument();

      // 値を確認
      expect(screen.getAllByText('0').length).toBeGreaterThan(0); // スコアとタイマーに0が表示される
      expect(screen.getByText('1 / 2')).toBeInTheDocument(); // ステージ（totalStagesはsteps.length - 1 = 2、最後のステップは回答不要）
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

    it('選択肢をクリックすると回答処理が実行される', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      const { container } = render(<GamePage />);

      await screen.findByText('邪馬台国');

      // 選択肢の1つをクリック（「卑弥呼」を選択）
      const himikoChoice = screen.getByText('卑弥呼');
      act(() => {
        himikoChoice.click();
      });

      // feedbackPhaseに入ることを確認
      let state = useGameStore.getState();
      expect(state.isFeedbackPhase).toBe(true);

      // 0.5秒待ってfeedbackPhaseが完了するのを待つ
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      // 正解したのでステージが進む
      state = useGameStore.getState();
      expect(state.currentStage).toBe(1);
      expect(state.score).toBeGreaterThan(0);
      expect(state.isFeedbackPhase).toBe(false);
    });

    it('タイマーが実際に動作している', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      const initialTime = useGameStore.getState().remainingTime;

      // 実際に少し待つ（300ms = 3カウント分）
      await new Promise((resolve) => setTimeout(resolve, 300));

      const afterTime = useGameStore.getState().remainingTime;
      // タイマーが減少していることを確認（最低2カウントは減っているはず）
      expect(afterTime).toBeLessThanOrEqual(initialTime - 2);
    });

    it('currentStageが範囲外の時は読み込み中と表示される', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // currentStageを範囲外に設定
      act(() => {
        useGameStore.setState({ currentStage: 999 });
      });

      // currentStepがundefinedなので読み込み中が表示される
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('エッジ表示が4秒後に自動的に非表示になる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // 正解を選択
      const himikoChoice = screen.getByText('卑弥呼');
      act(() => {
        himikoChoice.click();
      });

      // feedbackPhase完了を待つ（0.5秒）
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      // エッジが表示される（feedbackPhase後に表示開始）
      expect(useGameStore.getState().showEdge).toBe(true);

      // 3.5秒待つ（合計4秒）
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3600));
      });

      // エッジが自動的に非表示になる
      expect(useGameStore.getState().showEdge).toBe(false);
    }, 10000); // タイムアウトを10秒に設定
  });

  describe('エラーハンドリング', () => {
    it('API失敗時にエラーメッセージが表示される', async () => {
      mockStartGameSession.mockRejectedValue(new Error('Network Error'));

      render(<GamePage />);

      await screen.findByText(/エラーが発生しました/);

      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });

  describe('ゲーム完了', () => {
    it('全ステージクリアで完了状態になる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // totalStagesが正しく設定されていることを確認
      // steps.length - 1 = 2 (最後のステップは回答不要)
      const beforeState = useGameStore.getState();
      expect(beforeState.totalStages).toBe(2);
      expect(beforeState.currentStage).toBe(0);

      // 全問正解でクリア（2回の回答が必要）
      await act(async () => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(2); // ステップ0 → feedbackPhase
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
        answerQuestion(6); // ステップ1 → feedbackPhase → ゲーム完了
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
      });

      // クリア画面の表示を確認
      const state = useGameStore.getState();
      // totalStages=2、2回正解で newStage(2) >= totalStages(2) でゲーム完了
      // COMPLETE表示用: currentStage + 1 === totalStages → 1 + 1 === 2 → "COMPLETE"
      expect(state.currentStage).toBe(1); // totalStages - 1 = 1
      expect(state.isCompleted).toBe(true);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('ゲームオーバー', () => {
    it('ライフが0になったらゲームオーバー状態になる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // 3回不正解でゲームオーバー
      await act(async () => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(999); // 不正解
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
        answerQuestion(999); // 不正解
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
        answerQuestion(999); // 不正解
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
      });

      // ゲームオーバーを確認
      const state = useGameStore.getState();
      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('結果送信', () => {
    it('結果送信が失敗してもエラーハンドリングされる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);
      mockSubmitGameResult.mockRejectedValue(new Error('Network Error'));

      // console.errorをモック
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      // 全問正解でクリア（結果送信が自動で行われる）
      await act(async () => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(2); // ステップ0 → feedbackPhase
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
        answerQuestion(6); // ステップ1 → feedbackPhase
        await new Promise((resolve) => setTimeout(resolve, 600)); // feedbackPhase完了待ち
      });

      // 結果送信が試行されることを確認
      await vi.waitFor(() => {
        expect(mockSubmitGameResult).toHaveBeenCalled();
      });

      // エラーログが出力されることを確認
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('結果送信エラー:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
