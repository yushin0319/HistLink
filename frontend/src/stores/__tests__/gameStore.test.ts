import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

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
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('startGame', () => {
    it('ゲームを開始できる（全難易度共通: 残り時間10.0秒 = 100）', () => {
      const { startGame } = useGameStore.getState();

      startGame('normal', 10);
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(1);
      expect(state.remainingTime).toBe(100); // 10.0秒 = 100 × 0.1秒
      expect(state.isPlaying).toBe(true);
    });
  });

  describe('answerQuestion', () => {
    beforeEach(() => {
      const { startGame } = useGameStore.getState();
      startGame('normal', 10);
    });

    it('即答（残り時間100）なら100点加算', () => {
      const { answerQuestion } = useGameStore.getState();

      answerQuestion(true);
      const state = useGameStore.getState();

      expect(state.score).toBe(100); // 100 - (100 - 100) = 100
      expect(state.currentStage).toBe(2);
      expect(state.lives).toBe(3);
      expect(state.remainingTime).toBe(100); // 次の問題用にリセット
    });

    it('5秒経過後（残り時間50）に正解なら50点加算', () => {
      const store = useGameStore.getState();

      // 5秒経過（50 × 0.1秒）
      for (let i = 0; i < 50; i++) {
        store.decrementTimer();
      }

      store.answerQuestion(true);
      const state = useGameStore.getState();

      expect(state.score).toBe(50); // 100 - (100 - 50) = 50
      expect(state.currentStage).toBe(2);
      expect(state.remainingTime).toBe(100); // リセット
    });

    it('残り時間1（0.1秒）で正解なら1点加算', () => {
      const store = useGameStore.getState();

      // 9.9秒経過（99 × 0.1秒）、残り0.1秒
      for (let i = 0; i < 99; i++) {
        store.decrementTimer();
      }

      store.answerQuestion(true);
      const state = useGameStore.getState();

      expect(state.score).toBe(1); // 残り時間 1 = 1点
      expect(state.currentStage).toBe(2);
    });

    it('不正解したらライフが減り、スコアは加算されない', () => {
      const { answerQuestion } = useGameStore.getState();

      answerQuestion(false);
      const state = useGameStore.getState();

      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(2);
      expect(state.lives).toBe(2);
    });

    it('ライフが0になったらゲームオーバー', () => {
      const { answerQuestion } = useGameStore.getState();

      // 3回不正解
      answerQuestion(false);
      answerQuestion(false);
      answerQuestion(false);

      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
    });

    it('最終ステージをクリアしたらゲーム完了', () => {
      const { answerQuestion } = useGameStore.getState();

      // 10問全て即答正解
      for (let i = 0; i < 10; i++) {
        answerQuestion(true);
      }

      const state = useGameStore.getState();

      expect(state.currentStage).toBe(10);
      expect(state.isPlaying).toBe(false);
      expect(state.score).toBe(1000); // 100点 × 10問
    });
  });

  describe('decrementTimer', () => {
    beforeEach(() => {
      const { startGame } = useGameStore.getState();
      startGame('normal', 10);
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
      expect(state.remainingTime).toBe(100); // リセットされる
      expect(state.currentStage).toBe(2); // 次のステージに進む
    });

    it('タイマー0でライフも0ならゲームオーバー', () => {
      const store = useGameStore.getState();

      // ライフを1にする
      store.answerQuestion(false);
      store.answerQuestion(false);

      // タイマーを0にする
      for (let i = 0; i < 100; i++) {
        store.decrementTimer();
      }

      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('resetGame', () => {
    it('ゲーム状態を初期化できる', () => {
      const { startGame, answerQuestion, resetGame } = useGameStore.getState();

      startGame('hard', 50);
      answerQuestion(true);
      answerQuestion(true);

      resetGame();
      const state = useGameStore.getState();

      expect(state.difficulty).toBe('normal');
      expect(state.totalStages).toBe(10);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.currentStage).toBe(0);
      expect(state.remainingTime).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });
});
