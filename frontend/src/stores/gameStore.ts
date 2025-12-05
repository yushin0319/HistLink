import { create } from 'zustand';
import type { RouteStepWithChoices } from '../types/api';

type Difficulty = 'easy' | 'normal' | 'hard';
type TotalStages = 10 | 30 | 50;

interface GameState {
  // プレイヤー情報
  playerName: string;

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

  // フィードバックフェーズ（回答後0.5秒の視覚フィードバック）
  isFeedbackPhase: boolean; // feedbackPhase中かどうか
  selectedAnswerId: number | null; // 選択された回答のID
  isLastAnswerCorrect: boolean | null; // 最後の回答が正解だったか

  // フィードバック表示
  showRelation: boolean; // リレーション説明を表示するか
  lastRelationKeyword: string; // 最後に表示したリレーションのキーワード
  lastRelationExplanation: string; // 最後に表示したリレーションの説明

  // アクション
  setPlayerName: (name: string) => void;
  loadGameData: (gameId: string, routeId: number, steps: RouteStepWithChoices[]) => void;
  startGame: (difficulty: Difficulty, totalStages: TotalStages) => void;
  answerQuestion: (selectedTermId: number) => void;
  completeFeedbackPhase: () => void; // feedbackPhase終了後のステージ遷移
  decrementTimer: () => void;
  resetGame: () => void;
}

const INITIAL_LIVES = 3;
const MAX_TIME = 200; // 20.0秒 = 200 × 0.1秒
const PLAYER_NAME_KEY = 'histlink_player_name';
const DEFAULT_PLAYER_NAME = 'あなた';

// localStorageから名前を読み込む
const getStoredPlayerName = (): string => {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || DEFAULT_PLAYER_NAME;
  } catch {
    return DEFAULT_PLAYER_NAME;
  }
};

// スコア計算：残り時間のみ（0-100点）
const calculateScore = (remainingTime: number): number => {
  return Math.max(0, remainingTime);
};

export const useGameStore = create<GameState>((set, get) => ({
  // 初期状態
  playerName: getStoredPlayerName(),
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
  isFeedbackPhase: false,
  selectedAnswerId: null,
  isLastAnswerCorrect: null,
  showRelation: false,
  lastRelationKeyword: '',
  lastRelationExplanation: '',

  // プレイヤー名を設定（localStorageにも保存）
  setPlayerName: (name) => {
    const trimmedName = name.trim() || DEFAULT_PLAYER_NAME;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, trimmedName);
    } catch {
      // localStorage書き込み失敗は無視
    }
    set({ playerName: trimmedName });
  },

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
  // feedbackPhaseに入り、completeFeedbackPhaseでステージ遷移する
  answerQuestion: (selectedTermId) => {
    const state = get();

    if (!state.isPlaying || state.steps.length === 0 || state.isFeedbackPhase) return;

    const currentStep = state.steps[state.currentStage];
    if (!currentStep) return;

    // 正解判定：選択された用語IDが正解の次の用語IDと一致するか
    const isCorrect = selectedTermId === currentStep.correct_next_id;

    // 正解・不正解どちらもリレーション情報を即座に表示開始
    const showRelation = true;
    const lastRelationKeyword = currentStep.keyword;
    const lastRelationExplanation = currentStep.relation_description;

    console.log('[gameStore] answerQuestion - isCorrect:', isCorrect, 'entering feedbackPhase');

    // feedbackPhaseに入る（0.5秒間視覚フィードバック表示）
    set({
      isFeedbackPhase: true,
      selectedAnswerId: selectedTermId,
      isLastAnswerCorrect: isCorrect,
      showRelation,
      lastRelationKeyword,
      lastRelationExplanation,
    });
  },

  // feedbackPhase終了後のステージ遷移処理
  completeFeedbackPhase: () => {
    const state = get();

    if (!state.isFeedbackPhase) return;

    const currentStep = state.steps[state.currentStage];
    if (!currentStep) return;

    const isCorrect = state.isLastAnswerCorrect ?? false;

    // スコア計算：正解時のみ残り時間で加算
    const earnedScore = isCorrect ? calculateScore(state.remainingTime) : 0;
    const newScore = state.score + earnedScore;
    const newLives = isCorrect ? state.lives : state.lives - 1;
    const newStage = state.currentStage + 1;

    // リレーション情報を継続表示（answerQuestionで設定済み）
    const showRelation = state.showRelation; // answerQuestionで設定した値をそのまま維持
    const lastRelationKeyword = state.lastRelationKeyword;
    const lastRelationExplanation = state.lastRelationExplanation;

    console.log('[gameStore] completeFeedbackPhase - isCorrect:', isCorrect, 'showRelation:', showRelation);

    // ライフが0になったらゲームオーバー
    if (newLives <= 0) {
      set({
        lives: 0,
        isPlaying: false,
        isCompleted: false,
        isFeedbackPhase: false,
        selectedAnswerId: null,
        isLastAnswerCorrect: null,
        showRelation: false,
      });
      return;
    }

    // 最終ステージをクリアしたらゲーム完了
    if (isCorrect && newStage >= state.totalStages) {
      set({
        score: newScore,
        lives: newLives,
        currentStage: state.totalStages - 1, // 最終ステージのまま（COMPLETE表示用）
        isPlaying: false,
        isCompleted: true,
        isFeedbackPhase: false,
        selectedAnswerId: null,
        isLastAnswerCorrect: null,
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
      isFeedbackPhase: false,
      selectedAnswerId: null,
      isLastAnswerCorrect: null,
      showRelation,
      lastRelationKeyword,
      lastRelationExplanation,
    });
  },

  // タイマーをデクリメント（0.1秒単位）
  decrementTimer: () => {
    const state = get();

    // feedbackPhase中はタイマーを停止
    if (!state.isPlaying || state.isFeedbackPhase) return;

    const newRemainingTime = state.remainingTime - 1;

    // タイマーが0になったらfeedbackPhaseに入る（緑背景のみ表示、ライフ-1）
    if (newRemainingTime <= 0) {
      const currentStep = state.steps[state.currentStage];
      const correctNextId = currentStep?.correct_next_id ?? null;

      set({
        remainingTime: 0,
        isFeedbackPhase: true,
        selectedAnswerId: correctNextId, // 正解を緑背景で表示
        isLastAnswerCorrect: false, // タイムアウトは不正解扱い
        showRelation: false, // タイムアウト時はrelation表示なし
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
      isFeedbackPhase: false,
      selectedAnswerId: null,
      isLastAnswerCorrect: null,
      showRelation: false,
      lastRelationKeyword: '',
      lastRelationExplanation: '',
    });
  },
}));
