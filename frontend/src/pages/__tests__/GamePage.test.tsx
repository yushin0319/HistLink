import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import GamePage from '../GamePage';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../services/gameApi';

// gameApi のモック
vi.mock('../../services/gameApi');

// gameStore のモック
vi.mock('../../stores/gameStore');

describe('GamePage', () => {
  const mockStartGameSession = vi.fn();
  const mockSubmitAnswer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // gameApi のモック設定
    vi.mocked(gameApi.startGameSession).mockImplementation(mockStartGameSession);
    vi.mocked(gameApi.submitAnswer).mockImplementation(mockSubmitAnswer);

    // gameStore のモック設定（初期状態）
    vi.mocked(useGameStore).mockReturnValue({
      difficulty: 'normal',
      totalStages: 10,
      lives: 3,
      score: 0,
      currentStage: 1,
      remainingTime: 100, // 10.0秒
      isPlaying: true,
      startGame: vi.fn(),
      answerQuestion: vi.fn(),
      decrementTimer: vi.fn(),
      resetGame: vi.fn(),
    });
  });

  describe('初期レンダリング', () => {
    it('ローディング状態が表示される', () => {
      mockStartGameSession.mockReturnValue(new Promise(() => {})); // 永遠に解決しないPromise

      render(<GamePage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('ゲーム情報（ライフ・スコア・ステージ）が表示される', async () => {
      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      render(<GamePage />);

      // ゲーム情報の表示を待つ
      await screen.findByText(/ライフ:/);

      expect(screen.getByText(/ライフ: 3/)).toBeInTheDocument();
      expect(screen.getByText(/スコア: 0/)).toBeInTheDocument();
      expect(screen.getByText(/ステージ: 1 \/ 10/)).toBeInTheDocument();
    });
  });

  describe('API統合', () => {
    it('マウント時にstartGameSessionが呼ばれる', async () => {
      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      expect(mockStartGameSession).toHaveBeenCalledWith('normal', 10);
      expect(mockStartGameSession).toHaveBeenCalledTimes(1);
    });

    it('現在の問題（GameCard）が表示される', async () => {
      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      expect(screen.getAllByText('ペリー来航')).toHaveLength(2); // GameCardとChoiceCard
      expect(screen.getByText('近代')).toBeInTheDocument();
      expect(screen.getByText('1853年、アメリカのペリー提督が浦賀に来航')).toBeInTheDocument();
    });

    it('選択肢（ChoiceCard）が4枚表示される', async () => {
      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      expect(screen.getByText('日米修好通商条約')).toBeInTheDocument();
      expect(screen.getByText('大政奉還')).toBeInTheDocument();
      expect(screen.getByText('明治維新')).toBeInTheDocument();
      // ペリー来航は重複（GameCardとChoiceCard両方）
      expect(screen.getAllByText('ペリー来航')).toHaveLength(2);
    });
  });

  describe('回答送信', () => {
    it('sessionIdがない場合、ChoiceCardクリックでsubmitAnswerは呼ばれない', async () => {
      const user = userEvent.setup();

      // sessionIdがnullを返すようにモック
      mockStartGameSession.mockResolvedValue({
        session_id: null as any, // sessionIdをnullにする
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      const choiceCard = screen.getByText('日米修好通商条約');
      await user.click(choiceCard);

      // sessionIdがnullの場合、submitAnswerは呼ばれない
      expect(mockSubmitAnswer).not.toHaveBeenCalled();
    });

    it('ChoiceCardをクリックするとsubmitAnswerが呼ばれる', async () => {
      const user = userEvent.setup();

      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      mockSubmitAnswer.mockResolvedValue({
        is_correct: true,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 100,
        next_term: {
          id: 3,
          name: '大政奉還',
          era: '近代',
          tags: ['政治'],
          description: '1867年、徳川慶喜が政権を朝廷に返上',
        },
        next_options: [
          { id: 5, name: '明治維新' },
          { id: 6, name: '廃藩置県' },
          { id: 7, name: '版籍奉還' },
          { id: 3, name: '大政奉還' },
        ],
        current_stage: 2,
        is_game_over: false,
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      const choiceCard = screen.getByText('日米修好通商条約');
      await user.click(choiceCard);

      expect(mockSubmitAnswer).toHaveBeenCalledWith('test-session-123', 2, 100);
    });

    it('正解後、次の問題が表示される', async () => {
      const user = userEvent.setup();

      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      mockSubmitAnswer.mockResolvedValue({
        is_correct: true,
        correct_term: {
          id: 2,
          name: '日米修好通商条約',
          era: '近代',
          tags: ['外交'],
          description: '1858年に結ばれた不平等条約',
        },
        score_earned: 100,
        next_term: {
          id: 3,
          name: '大政奉還',
          era: '近代',
          tags: ['政治'],
          description: '1867年、徳川慶喜が政権を朝廷に返上',
        },
        next_options: [
          { id: 5, name: '明治維新' },
          { id: 6, name: '廃藩置県' },
          { id: 7, name: '版籍奉還' },
          { id: 3, name: '大政奉還' },
        ],
        current_stage: 2,
        is_game_over: false,
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      const choiceCard = screen.getByText('日米修好通商条約');
      await user.click(choiceCard);

      // 次の問題が表示される
      await screen.findByText('1867年、徳川慶喜が政権を朝廷に返上');

      expect(screen.getAllByText('大政奉還')).toHaveLength(2); // GameCardとChoiceCard
      expect(screen.getByText('1867年、徳川慶喜が政権を朝廷に返上')).toBeInTheDocument();
      expect(screen.getByText('明治維新')).toBeInTheDocument();
      expect(screen.getByText('廃藩置県')).toBeInTheDocument();
      expect(screen.getByText('版籍奉還')).toBeInTheDocument();
    });

    it('ゲームオーバー時は次の問題を表示しない', async () => {
      const user = userEvent.setup();

      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 10,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      mockSubmitAnswer.mockResolvedValue({
        is_correct: false,
        correct_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        score_earned: 0,
        next_term: null,
        next_options: [],
        current_stage: 10,
        is_game_over: true,
      });

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      const choiceCard = screen.getByText('日米修好通商条約');
      await user.click(choiceCard);

      // ゲームオーバー時は画面遷移しない（元の問題が残る）
      expect(mockSubmitAnswer).toHaveBeenCalledWith('test-session-123', 2, 100);
      // 次の問題は表示されない（ペリー来航が残る）
      expect(screen.getAllByText('ペリー来航')).toHaveLength(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('API失敗時にエラーメッセージが表示される', async () => {
      mockStartGameSession.mockRejectedValue(new Error('Network Error'));

      render(<GamePage />);

      await screen.findByText(/エラーが発生しました/);

      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });

    it('回答送信失敗時にエラーメッセージが表示される', async () => {
      const user = userEvent.setup();

      mockStartGameSession.mockResolvedValue({
        session_id: 'test-session-123',
        route_id: 1,
        difficulty: 'normal',
        total_stages: 10,
        current_stage: 1,
        current_term: {
          id: 1,
          name: 'ペリー来航',
          era: '近代',
          tags: ['外交', '開国'],
          description: '1853年、アメリカのペリー提督が浦賀に来航',
        },
        options: [
          { id: 2, name: '日米修好通商条約' },
          { id: 3, name: '大政奉還' },
          { id: 4, name: '明治維新' },
          { id: 1, name: 'ペリー来航' },
        ],
      });

      mockSubmitAnswer.mockRejectedValue(new Error('Server Error'));

      render(<GamePage />);

      await screen.findByText('日米修好通商条約');

      const choiceCard = screen.getByText('日米修好通商条約');
      await user.click(choiceCard);

      await screen.findByText(/回答の送信に失敗しました/);

      expect(screen.getByText(/回答の送信に失敗しました/)).toBeInTheDocument();
    });
  });
});
