import { create } from 'zustand';
import type { RouteStepWithChoices } from '../types/api';

type Difficulty = 'easy' | 'normal' | 'hard';
type TotalStages = 10 | 30 | 50;

interface GameState {
  // ゲーム設定
  difficulty: Difficulty;
  totalStages: TotalStages;

  // ゲームデータ（バックエンドから取得）
  gameId: string | null;
  routeId: number | null;
  steps: RouteStepWithChoices[]; // 全ルート+選択肢

  // ゲーム進行状態
  lives: number;
  score: number;
  currentStage: number; // 0-indexed (steps配列のインデックスと対応)
  remainingTime: number; // 残り時間（0.1秒単位、100 = 10.0秒）

  // ゲーム状態
  isPlaying: boolean;
  isCompleted: boolean; // ゲームクリアしたか

  // フィードバック表示
  showRelation: boolean; // リレーション説明を表示するか
  lastRelationKeyword: string; // 最後に表示したリレーションのキーワード
  lastRelationExplanation: string; // 最後に表示したリレーションの説明

  // アクション
  loadGameData: (gameId: string, routeId: number, steps: RouteStepWithChoices[]) => void;
  startGame: (difficulty: Difficulty, totalStages: TotalStages) => void;
  answerQuestion: (selectedTermId: number) => void;
  decrementTimer: () => void;
  resetGame: () => void;
}

const INITIAL_LIVES = 3;
const MAX_TIME = 200; // 20.0秒 = 200 × 0.1秒

// スコア計算：残り時間のみ（0-100点）
const calculateScore = (remainingTime: number): number => {
  return Math.max(0, remainingTime);
};

export const useGameStore = create<GameState>((set, get) => ({
  // 初期状態
  difficulty: 'normal',
  totalStages: 10,
  gameId: null,
  routeId: null,
  steps: [],
  lives: INITIAL_LIVES,
  score: 0,
  currentStage: 0,
  remainingTime: 0,
  isPlaying: false,
  isCompleted: false,
  showRelation: false,
  lastRelationKeyword: '',
  lastRelationExplanation: '',

  // バックエンドから取得したゲームデータを読み込む
  loadGameData: (gameId, routeId, steps) => {
    set({
      gameId,
      routeId,
      steps,
      totalStages: steps?.length ?? 10,
    });
  },

  // ゲーム開始
  startGame: (difficulty, totalStages) => {
    set({
      difficulty,
      totalStages,
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0, // 0-indexed
      remainingTime: MAX_TIME,
      isPlaying: true,
      isCompleted: false,
    });
  },

  // 問題に回答（選択された用語IDを受け取る）
  answerQuestion: (selectedTermId) => {
    const state = get();

    if (!state.isPlaying || state.steps.length === 0) return;

    const currentStep = state.steps[state.currentStage];
    if (!currentStep) return;

    // 正解判定：選択された用語IDが正解の次の用語IDと一致するか
    const isCorrect = selectedTermId === currentStep.correct_next_id;

    // スコア計算：正解時のみ残り時間で加算
    const earnedScore = isCorrect ? calculateScore(state.remainingTime) : 0;
    const newScore = state.score + earnedScore;
    const newLives = isCorrect ? state.lives : state.lives - 1;
    const newStage = state.currentStage + 1;

    // 正解時はリレーション情報を表示
    const showRelation = isCorrect;
    const lastRelationKeyword = isCorrect ? currentStep.relation_type : '';
    const lastRelationExplanation = isCorrect ? currentStep.relation_description : '';

    console.log('[gameStore] answerQuestion - isCorrect:', isCorrect, 'showRelation:', showRelation, 'keyword:', lastRelationKeyword, 'explanation:', lastRelationExplanation);

    // ライフが0になったらゲームオーバー
    if (newLives <= 0) {
      set({
        lives: 0,
        isPlaying: false,
        isCompleted: false,
        showRelation: false,
      });
      return;
    }

    // 最終ステージをクリアしたらゲーム完了
    // totalStagesは全ステップ数（最後のステップは選択肢なし）
    // 正解した場合のみ、全ての質問に答えたかチェック
    if (isCorrect && newStage >= state.totalStages - 1) {
      set({
        score: newScore,
        lives: newLives,
        currentStage: newStage,
        isPlaying: false,
        isCompleted: true,
        showRelation,
        lastRelationKeyword,
        lastRelationExplanation,
      });
      return;
    }

    // 次のステージへ（タイマーリセット）
    set({
      score: newScore,
      lives: newLives,
      currentStage: newStage,
      remainingTime: MAX_TIME,
      showRelation,
      lastRelationKeyword,
      lastRelationExplanation,
    });
  },

  // タイマーをデクリメント（0.1秒単位）
  decrementTimer: () => {
    const state = get();

    if (!state.isPlaying) return;

    const newRemainingTime = state.remainingTime - 1;

    // タイマーが0になったらライフを減らして次のステージへ（不正解扱い）
    if (newRemainingTime <= 0) {
      const newLives = state.lives - 1;
      const newStage = state.currentStage + 1;

      // ライフが0になったらゲームオーバー
      if (newLives <= 0) {
        set({
          remainingTime: 0,
          lives: 0,
          isPlaying: false,
          isCompleted: false,
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
      gameId: null,
      routeId: null,
      steps: [],
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0,
      remainingTime: 0,
      isPlaying: false,
      isCompleted: false,
      showRelation: false,
      lastRelationKeyword: '',
      lastRelationExplanation: '',
    });
  },
}));
