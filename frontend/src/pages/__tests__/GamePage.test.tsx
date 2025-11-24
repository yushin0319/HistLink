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
    term: { id: 1, name: '邪馬台国', era: '弥生時代', tags: [], description: '卑弥呼が治めた国' },
    correct_next_id: 2,
    choices: [
      { term_id: 2, name: '卑弥呼', era: '弥生時代' },
      { term_id: 3, name: '聖徳太子', era: '飛鳥時代' },
      { term_id: 4, name: '中大兄皇子', era: '飛鳥時代' },
      { term_id: 5, name: '藤原道長', era: '平安時代' },
    ],
    relation_type: '統治者',
    keyword: '女王卑弥呼',
    relation_description: '邪馬台国を統治した女王',
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
    relation_type: '時代変化',
    keyword: '律令制度',
    relation_description: '大化の改新により律令制度が導入された',
  },
  {
    step_no: 2,
    term: { id: 6, name: '大化の改新', era: '飛鳥時代', tags: [], description: '645年の政治改革' },
    correct_next_id: null,
    choices: [],
    relation_type: '',
    keyword: '',
    relation_description: '',
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
      expect(screen.getByText('0')).toBeInTheDocument(); // スコア
      expect(screen.getByText('1 / 3')).toBeInTheDocument(); // ステージ（totalStagesはsteps.lengthの3）
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

  describe('ゲーム完了', () => {
    it('全ステージクリアで完了状態になる', async () => {
      mockStartGameSession.mockResolvedValue(mockGameStartResponse);

      render(<GamePage />);

      await screen.findByText('邪馬台国');

      // totalStagesが正しく設定されていることを確認
      const beforeState = useGameStore.getState();
      expect(beforeState.totalStages).toBe(3); // steps.lengthから設定される
      expect(beforeState.currentStage).toBe(0);

      // 全問正解でクリア
      act(() => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(2); // ステップ0 → 1
        answerQuestion(6); // ステップ1 → 2（最終ステップ）
      });

      // クリア画面の表示を確認
      const state = useGameStore.getState();
      expect(state.currentStage).toBe(2);
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
      act(() => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(999); // 不正解
        answerQuestion(999); // 不正解
        answerQuestion(999); // 不正解
      });

      // ゲームオーバーを確認
      const state = useGameStore.getState();
      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });
  });
});
