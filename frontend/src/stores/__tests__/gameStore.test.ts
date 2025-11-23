import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import type { RouteStepWithChoices } from '../../types/api';

// モックデータ: 3ステップのルート
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: { id: 1, name: '邪馬台国', era: '弥生時代', tags: [], description: '' },
    correct_next_id: 2,
    choices: [
      { term_id: 2, name: '卑弥呼', era: '弥生時代' },
      { term_id: 3, name: '聖徳太子', era: '飛鳥時代' },
      { term_id: 4, name: '中大兄皇子', era: '飛鳥時代' },
      { term_id: 5, name: '藤原道長', era: '平安時代' },
    ],
  },
  {
    step_no: 1,
    term: { id: 2, name: '卑弥呼', era: '弥生時代', tags: [], description: '' },
    correct_next_id: 6,
    choices: [
      { term_id: 6, name: '大化の改新', era: '飛鳥時代' },
      { term_id: 7, name: '壬申の乱', era: '飛鳥時代' },
      { term_id: 8, name: '平城京', era: '奈良時代' },
      { term_id: 9, name: '平安京', era: '平安時代' },
    ],
  },
  {
    step_no: 2,
    term: { id: 6, name: '大化の改新', era: '飛鳥時代', tags: [], description: '' },
    correct_next_id: null, // 最後のステップ
    choices: [],
  },
];

describe('gameStore', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    const { resetGame } = useGameStore.getState();
    resetGame();
  });

  describe('初期状態', () => {
    it('正しい初期値が設定されている', () => {
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.gameId).toBeNull();
      expect(state.routeId).toBeNull();
      expect(state.steps).toEqual([]);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('loadGameData', () => {
    it('バックエンドから取得したゲームデータを読み込める', () => {
      const { loadGameData } = useGameStore.getState();

      loadGameData('test-game-id', 123, mockSteps);
      const state = useGameStore.getState();

      expect(state.gameId).toBe('test-game-id');
      expect(state.routeId).toBe(123);
      expect(state.steps).toEqual(mockSteps);
      expect(state.totalStages).toBe(3); // steps.lengthから自動設定
    });
  });

  describe('startGame', () => {
    it('ゲームを開始できる（残り時間10.0秒 = 100）', () => {
      const { startGame } = useGameStore.getState();

      startGame('normal', 10);
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0); // 0-indexed
      expect(state.remainingTime).toBe(100); // 10.0秒 = 100 × 0.1秒
      expect(state.isPlaying).toBe(true);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('answerQuestion', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', 123, mockSteps);
      startGame('normal', 3);
    });

    it('正解したら次のステージに進む', () => {
      const { answerQuestion } = useGameStore.getState();

      // ステップ0: 正解は2（卑弥呼）
      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(100); // 即答なら100点
      expect(state.remainingTime).toBe(100); // リセット
    });

    it('不正解したらライフが減る', () => {
      const { answerQuestion } = useGameStore.getState();

      // ステップ0: 正解は2だが、3を選択
      answerQuestion(3);
      const state = useGameStore.getState();

      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(2);
      expect(state.score).toBe(0); // スコア加算なし
    });

    it('残り時間に応じてスコアが変動する', () => {
      const store = useGameStore.getState();

      // 5秒経過（50 × 0.1秒）
      for (let i = 0; i < 50; i++) {
        store.decrementTimer();
      }

      // 残り時間50で正解
      store.answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.score).toBe(50); // 残り時間50 = 50点
    });

    it('ライフが0になったらゲームオーバー', () => {
      const { answerQuestion } = useGameStore.getState();

      // 3回不正解
      answerQuestion(999); // 不正解
      answerQuestion(999); // 不正解
      answerQuestion(999); // 不正解

      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });

    it('最終ステージをクリアしたらゲーム完了', () => {
      const { answerQuestion } = useGameStore.getState();

      // ステップ0, 1を正解で進む（ステップ2は最後なので選択肢なし）
      answerQuestion(2); // ステップ0 → 1
      answerQuestion(6); // ステップ1 → 2（最終ステップ）

      const state = useGameStore.getState();

      expect(state.currentStage).toBe(2); // 最終ステップに到達
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(true);
      expect(state.score).toBe(200); // 100 + 100
    });

    it('ゲーム未開始時は何も起きない', () => {
      const { resetGame, answerQuestion } = useGameStore.getState();
      resetGame(); // isPlaying=falseに

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
    });

    it('stepsが空の時は何も起きない', () => {
      const { resetGame, startGame, answerQuestion } = useGameStore.getState();
      resetGame();
      // stepsを読み込まずにstartGame
      startGame('normal', 10);

      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
    });
  });

  describe('decrementTimer', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', 123, mockSteps);
      startGame('normal', 3);
    });

    it('タイマーを0.1秒減らせる', () => {
      const { decrementTimer } = useGameStore.getState();

      decrementTimer();
      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(99);
    });

    it('タイマーが0になったらライフが減り、次のステージへ', () => {
      const store = useGameStore.getState();

      // タイマーを0にする（100回 × 0.1秒 = 10秒）
      for (let i = 0; i < 100; i++) {
        store.decrementTimer();
      }

      const state = useGameStore.getState();

      expect(state.lives).toBe(2);
      expect(state.remainingTime).toBe(100); // リセット
      expect(state.currentStage).toBe(1); // 次のステージへ
    });

    it('タイマー0でライフも0ならゲームオーバー', () => {
      const store = useGameStore.getState();

      // ライフを1にする
      store.answerQuestion(999); // 不正解
      store.answerQuestion(999); // 不正解

      // タイマーを0にする
      for (let i = 0; i < 100; i++) {
        store.decrementTimer();
      }

      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });

    it('ゲーム停止中は何も起きない', () => {
      const { resetGame, decrementTimer } = useGameStore.getState();
      resetGame(); // isPlaying=false

      decrementTimer();
      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(0);
    });
  });

  describe('resetGame', () => {
    it('ゲーム状態を初期化できる', () => {
      const { loadGameData, startGame, answerQuestion, resetGame } =
        useGameStore.getState();

      loadGameData('test-game-id', 123, mockSteps);
      startGame('hard', 3);
      answerQuestion(2);
      answerQuestion(6);

      resetGame();
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.gameId).toBeNull();
      expect(state.routeId).toBeNull();
      expect(state.steps).toEqual([]);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
    });
  });
});
