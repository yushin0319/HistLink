import { beforeEach, describe, expect, it } from 'vitest';
import type { RouteStepWithChoices } from '../../types/api';
import { useGameStore } from '../gameStore';

// モックデータ: 4ステップのルート（3回の回答が必要）
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: {
      id: 1,
      name: '邪馬台国',
      tier: 1,
      category: '弥生時代',
      description: '',
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
      description: '',
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
      description: '',
    },
    correct_next_id: 10,
    choices: [
      { term_id: 10, name: '壬申の乱', tier: 1 },
      { term_id: 11, name: '白村江の戦い', tier: 2 },
      { term_id: 12, name: '遣唐使', tier: 1 },
      { term_id: 13, name: '奈良時代', tier: 1 },
    ],
    difficulty: 'normal',
    keyword: '天智天皇',
    edge_description: '大化の改新後の政治変動',
  },
  {
    step_no: 3,
    term: {
      id: 10,
      name: '壬申の乱',
      tier: 1,
      category: '飛鳥時代',
      description: '',
    },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('gameStore ゲームフロー', () => {
  beforeEach(() => {
    const { resetGame } = useGameStore.getState();
    resetGame();
  });

  describe('completeFeedbackPhase', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', mockSteps);
      startGame('normal', 3);
    });

    it('正解後feedbackPhaseを完了すると次のステージに進む', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      answerQuestion(2);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(false);
      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(200);
      expect(state.remainingTime).toBe(200);
      expect(state.edgeData.show).toBe(true);
      expect(state.edgeData.keyword).toBe('女王卑弥呼');
    });

    it('不正解後feedbackPhaseを完了するとライフが減る', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      answerQuestion(3);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(false);
      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(2);
      expect(state.score).toBe(0);
      expect(state.edgeData.show).toBe(true);
      expect(state.edgeData.keyword).toBe('女王卑弥呼');
    });

    it('残り時間に応じてスコアが変動する', () => {
      const store = useGameStore.getState();

      for (let i = 0; i < 50; i++) {
        store.decrementTimer();
      }

      store.answerQuestion(2);
      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.score).toBe(150);
    });

    it('ライフが0になったらゲームオーバー', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      answerQuestion(999);
      completeFeedbackPhase();
      answerQuestion(999);
      completeFeedbackPhase();
      answerQuestion(999);
      completeFeedbackPhase();

      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
      expect(state.isFeedbackPhase).toBe(false);
    });

    it('最終ステージをクリアしたらゲーム完了', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      answerQuestion(2);
      completeFeedbackPhase();
      answerQuestion(6);
      completeFeedbackPhase();
      answerQuestion(10);
      completeFeedbackPhase();

      const state = useGameStore.getState();

      expect(state.currentStage).toBe(2);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(true);
      expect(state.isFeedbackPhase).toBe(false);
      expect(state.score).toBe(600);
    });

    it('feedbackPhase中でない時は何も起きない', () => {
      const { completeFeedbackPhase } = useGameStore.getState();

      completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.currentStage).toBe(0);
      expect(state.score).toBe(0);
    });
  });

  describe('decrementTimer', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', mockSteps);
      startGame('normal', 3);
    });

    it('タイマーを0.1秒減らせる', () => {
      const { decrementTimer } = useGameStore.getState();

      decrementTimer();
      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(199);
    });

    it('feedbackPhase中はタイマーが停止する', () => {
      const store = useGameStore.getState();

      store.answerQuestion(2);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      const timeBeforeDecrement = useGameStore.getState().remainingTime;

      store.decrementTimer();
      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(timeBeforeDecrement);
    });

    it('タイマーが0になったらfeedbackPhaseに入る', () => {
      const store = useGameStore.getState();

      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(0);
      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(2);
      expect(state.isLastAnswerCorrect).toBe(false);
      expect(state.edgeData.show).toBe(false);
    });

    it('タイムアウト後feedbackPhaseを完了するとライフが減る', () => {
      const store = useGameStore.getState();

      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.lives).toBe(2);
      expect(state.remainingTime).toBe(200);
      expect(state.currentStage).toBe(1);
      expect(state.isFeedbackPhase).toBe(false);
    });

    it('タイマー0＋feedbackPhase完了でライフ0ならゲームオーバー', () => {
      const store = useGameStore.getState();

      store.answerQuestion(999);
      store.completeFeedbackPhase();
      store.answerQuestion(999);
      store.completeFeedbackPhase();

      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
      expect(state.isFeedbackPhase).toBe(false);
    });

    it('ゲーム停止中は何も起きない', () => {
      const { resetGame, decrementTimer } = useGameStore.getState();
      resetGame();

      decrementTimer();
      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(0);
    });
  });
});
