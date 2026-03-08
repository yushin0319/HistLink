import { act, render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { useGameStore } from '../../stores/gameStore';
import type { GameStartResponse, RouteStepWithChoices } from '../../types/api';
import GamePage from '../GamePage';

const API_BASE = 'http://localhost:8000/api/v1';

const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: {
      id: 1,
      name: '邪馬台国',
      tier: 1,
      category: '弥生時代',
      description: '卑弥呼が治めた国',
    },
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
    term: {
      id: 2,
      name: '卑弥呼',
      tier: 1,
      category: '弥生時代',
      description: '邪馬台国の女王',
    },
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
    term: {
      id: 6,
      name: '大化の改新',
      tier: 1,
      category: '飛鳥時代',
      description: '645年の政治改革',
    },
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
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('ゲーム完了', () => {
    it('全ステージクリアで完了状態になる', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      // totalStagesが正しく設定されていることを確認
      const beforeState = useGameStore.getState();
      expect(beforeState.totalStages).toBe(2);
      expect(beforeState.currentStage).toBe(0);

      // 全問正解でクリア（2回の回答が必要）
      await act(async () => {
        const { answerQuestion } = useGameStore.getState();
        answerQuestion(2); // ステップ0 → feedbackPhase
        await new Promise((resolve) => setTimeout(resolve, 600));
        answerQuestion(6); // ステップ1 → feedbackPhase → ゲーム完了
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      const state = useGameStore.getState();
      expect(state.currentStage).toBe(1);
      expect(state.isCompleted).toBe(true);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('ゲームオーバー', () => {
    it('ライフが0になったらゲームオーバー状態になる', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      useGameStore.setState({ totalStages: 10 });

      // 3回不正解でゲームオーバー
      await act(async () => {
        const { answerQuestion, completeFeedbackPhase } =
          useGameStore.getState();
        answerQuestion(999);
        completeFeedbackPhase();
        answerQuestion(999);
        completeFeedbackPhase();
        answerQuestion(999);
        completeFeedbackPhase();
      });

      const state = useGameStore.getState();
      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('cleanup / キャンセル', () => {
    it('アンマウント中にAPIコールが完了しても状態を更新しない', async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((resolve) => {
        resolveGate = resolve;
      });
      let requestReceived = false;
      server.use(
        http.post(`${API_BASE}/games/start`, async () => {
          requestReceived = true;
          await gate;
          return HttpResponse.json(mockGameStartResponse);
        }),
      );

      const { unmount } = render(<GamePage />);

      // MSWがリクエストを受け取るまで待機
      await waitFor(() => expect(requestReceived).toBe(true));

      // アンマウント（useEffect cleanup が走り cancelled = true になる）
      unmount();

      // アンマウント後にAPIレスポンスを解決（遅延完了を模擬）
      await act(async () => {
        resolveGate();
      });

      // キャンセルされているためgameIdはnullのまま
      expect(useGameStore.getState().gameId).toBeNull();
    });
  });
});
