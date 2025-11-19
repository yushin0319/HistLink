import { create } from 'zustand';

type Difficulty = 'easy' | 'normal' | 'hard';
type TotalStages = 10 | 30 | 50;

interface GameState {
  // ゲーム設定
  difficulty: Difficulty;
  totalStages: TotalStages;

  // ゲーム進行状態
  lives: number;
  score: number;
  currentStage: number;
  remainingTime: number; // 残り時間（0.1秒単位、100 = 10.0秒）

  // ゲーム状態
  isPlaying: boolean;

  // アクション
  startGame: (difficulty: Difficulty, totalStages: TotalStages) => void;
  answerQuestion: (isCorrect: boolean) => void;
  decrementTimer: () => void;
  resetGame: () => void;
}

const INITIAL_LIVES = 3;
const MAX_TIME = 100; // 10.0秒 = 100 × 0.1秒
const MAX_SCORE = 100; // 最大スコア

// スコア計算：残り時間に基づく（即答100点 → 10秒経過0点）
const calculateScore = (remainingTime: number): number => {
  return Math.max(0, remainingTime); // 残り時間 = スコア
};

export const useGameStore = create<GameState>((set, get) => ({
  // 初期状態
  difficulty: 'normal',
  totalStages: 10,
  lives: INITIAL_LIVES,
  score: 0,
  currentStage: 0,
  remainingTime: 0,
  isPlaying: false,

  // ゲーム開始
  startGame: (difficulty, totalStages) => {
    set({
      difficulty,
      totalStages,
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 1,
      remainingTime: MAX_TIME, // 10.0秒
      isPlaying: true,
    });
  },

  // 問題に回答
  answerQuestion: (isCorrect) => {
    const state = get();

    if (!state.isPlaying) return;

    // スコア計算：正解時のみ残り時間に応じて加算（リセット前の値を使用）
    const earnedScore = isCorrect ? calculateScore(state.remainingTime) : 0;
    const newScore = state.score + earnedScore;
    const newLives = isCorrect ? state.lives : state.lives - 1;
    const newStage = state.currentStage + 1;

    // ライフが0になったらゲームオーバー
    if (newLives <= 0) {
      set({
        lives: 0,
        isPlaying: false,
      });
      return;
    }

    // 最終ステージをクリアしたらゲーム完了
    if (newStage > state.totalStages) {
      set({
        score: newScore,
        currentStage: state.totalStages,
        isPlaying: false,
      });
      return;
    }

    // 次のステージへ（タイマーリセット）
    set({
      score: newScore,
      lives: newLives,
      currentStage: newStage,
      remainingTime: MAX_TIME, // タイマーリセット
    });
  },

  // タイマーをデクリメント（0.1秒単位）
  decrementTimer: () => {
    const state = get();

    if (!state.isPlaying) return;

    const newRemainingTime = state.remainingTime - 1;

    // タイマーが0になったらライフを減らして次のステージへ
    if (newRemainingTime <= 0) {
      const newLives = state.lives - 1;
      const newStage = state.currentStage + 1;

      // ライフが0になったらゲームオーバー
      if (newLives <= 0) {
        set({
          remainingTime: 0,
          lives: 0,
          isPlaying: false,
        });
        return;
      }

      // 次のステージへ（タイマーリセット）
      set({
        lives: newLives,
        currentStage: newStage,
        remainingTime: MAX_TIME,
      });
      return;
    }

    set({ remainingTime: newRemainingTime });
  },

  // ゲームリセット
  resetGame: () => {
    set({
      difficulty: 'normal',
      totalStages: 10,
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0,
      remainingTime: 0,
      isPlaying: false,
    });
  },
}));
