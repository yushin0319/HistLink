import { act, render, screen } from '@testing-library/react';
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

  describe('初期レンダリング', () => {
    it('ローディング状態が表示される', () => {
      server.use(
        http.post(`${API_BASE}/games/start`, async () => {
          await new Promise(() => {}); // 永遠に解決しない
        }),
      );

      render(<GamePage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('ゲーム開始時、startGameSessionが呼ばれる', async () => {
      let capturedBody:
        | { difficulty: string; target_length: number }
        | undefined;
      server.use(
        http.post(`${API_BASE}/games/start`, async ({ request }) => {
          capturedBody = (await request.json()) as {
            difficulty: string;
            target_length: number;
          };
          return HttpResponse.json(mockGameStartResponse);
        }),
      );

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      expect(capturedBody).toMatchObject({
        difficulty: 'normal',
        target_length: 10,
      });
    });

    it('ゲーム情報が表示される', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      // GameHeaderの英語ラベルを確認
      expect(screen.getByText('LIFE')).toBeInTheDocument();
      expect(screen.getByText('SCORE')).toBeInTheDocument();
      expect(screen.getByText('STAGE')).toBeInTheDocument();
      expect(screen.getByText('TIMER')).toBeInTheDocument();
      // スコアとタイマーに0が表示される
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      // ステージ（totalStagesはsteps.length - 1 = 2、最後のステップは回答不要）
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('最初のステップが表示される', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

      render(<GamePage />);
      await screen.findByText('邪馬台国');

      expect(screen.getByText('卑弥呼が治めた国')).toBeInTheDocument();
      expect(screen.getByText('卑弥呼')).toBeInTheDocument();
      expect(screen.getByText('聖徳太子')).toBeInTheDocument();
      expect(screen.getByText('中大兄皇子')).toBeInTheDocument();
      expect(screen.getByText('藤原道長')).toBeInTheDocument();
    });

    it('選択肢をクリックすると回答処理が実行される', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

      render(<GamePage />);
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
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

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
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

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
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json(mockGameStartResponse),
        ),
      );

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
      expect(useGameStore.getState().edgeData.show).toBe(true);

      // 3.5秒待つ（合計4秒）
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3600));
      });

      // エッジが自動的に非表示になる
      expect(useGameStore.getState().edgeData.show).toBe(false);
    }, 10000); // タイムアウトを10秒に設定
  });

  describe('エラーハンドリング', () => {
    it('API失敗時にエラーメッセージが表示される', async () => {
      server.use(
        http.post(`${API_BASE}/games/start`, () =>
          HttpResponse.json({ error: 'Network Error' }, { status: 500 }),
        ),
      );

      render(<GamePage />);

      await screen.findByText(/エラーが発生しました/);

      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });
});
