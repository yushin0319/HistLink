import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import type { RouteStepWithChoices } from '../../types/api';

// モックデータ: 4ステップのルート（3回の回答が必要）
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: { id: 1, name: '邪馬台国', tier: 1, category: '弥生時代', description: '' },
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
    term: { id: 2, name: '卑弥呼', tier: 1, category: '弥生時代', description: '' },
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
    term: { id: 6, name: '大化の改新', tier: 1, category: '飛鳥時代', description: '' },
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
    term: { id: 10, name: '壬申の乱', tier: 1, category: '飛鳥時代', description: '' },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('gameStore 状態管理', () => {
  beforeEach(() => {
    const { resetGame } = useGameStore.getState();
    resetGame();
  });

  describe('初期状態', () => {
    it('正しい初期値が設定されている', () => {
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.gameId).toBeNull();
      expect(state.steps).toEqual([]);
      expect(state.myRank).toBeNull();
      expect(state.rankings).toEqual([]);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
      expect(state.isFeedbackPhase).toBe(false);
      expect(state.selectedAnswerId).toBeNull();
      expect(state.isLastAnswerCorrect).toBeNull();
    });
  });

  describe('loadGameData', () => {
    it('バックエンドから取得したゲームデータを読み込める', () => {
      const { loadGameData } = useGameStore.getState();

      loadGameData('test-game-id', mockSteps);
      const state = useGameStore.getState();

      expect(state.gameId).toBe('test-game-id');
      expect(state.steps).toEqual(mockSteps);
      expect(state.totalStages).toBe(10); // 初期値のまま
    });

    it('loadGameData + startGameでtotalStagesが正しく設定される', () => {
      const { loadGameData, startGame } = useGameStore.getState();

      loadGameData('test-game-id', mockSteps);
      startGame('normal', mockSteps.length - 1);
      const state = useGameStore.getState();

      expect(state.totalStages).toBe(3); // 4ステップ - 1 = 3問
    });
  });

  describe('startGame', () => {
    it('ゲームを開始できる（残り時間20.0秒 = 200）', () => {
      const { startGame } = useGameStore.getState();

      startGame('normal', 10);
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(200);
      expect(state.isPlaying).toBe(true);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('answerQuestion', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', mockSteps);
      startGame('normal', mockSteps.length - 1);
    });

    it('正解したらfeedbackPhaseに入る', () => {
      const { answerQuestion } = useGameStore.getState();

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(2);
      expect(state.isLastAnswerCorrect).toBe(true);
      expect(state.showEdge).toBe(true);
      expect(state.lastEdgeKeyword).toBe('女王卑弥呼');
      expect(state.currentStage).toBe(0);
    });

    it('不正解したらfeedbackPhaseに入り、edge表示が開始される', () => {
      const { answerQuestion } = useGameStore.getState();

      answerQuestion(3);
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(3);
      expect(state.isLastAnswerCorrect).toBe(false);
      expect(state.showEdge).toBe(true);
      expect(state.lastEdgeKeyword).toBe('女王卑弥呼');
      expect(state.currentStage).toBe(0);
    });

    it('feedbackPhase中は追加の回答を受け付けない', () => {
      const { answerQuestion } = useGameStore.getState();

      answerQuestion(2);
      const stateAfterFirst = useGameStore.getState();
      expect(stateAfterFirst.isFeedbackPhase).toBe(true);

      answerQuestion(3);
      const stateAfterSecond = useGameStore.getState();

      expect(stateAfterSecond.selectedAnswerId).toBe(2);
    });

    it('ゲーム未開始時は何も起きない', () => {
      const { resetGame, answerQuestion } = useGameStore.getState();
      resetGame();

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
    });

    it('stepsが空の時は何も起きない', () => {
      const { resetGame, startGame, answerQuestion } = useGameStore.getState();
      resetGame();
      startGame('normal', 10);

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
    });

    it('currentStageが範囲外の時は何も起きない', () => {
      const { loadGameData, startGame, answerQuestion } = useGameStore.getState();
      loadGameData('test-game-id', mockSteps);
      startGame('normal', 10);

      useGameStore.setState({ currentStage: 999 });

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(false);
    });
  });
});
