import { create } from 'zustand';
import type { RouteStepWithChoices, RankingEntry } from '../types/api';

type Difficulty = 'easy' | 'normal' | 'hard';

interface GameState {
  // プレイヤー情報
  playerName: string;

  // ゲーム設定
  difficulty: Difficulty;
  totalStages: number;

  // ゲーム開始待機状態（ルール画面表示用）
  pendingStart: boolean;

  // ゲームデータ（バックエンドから取得）
  gameId: string | null;
  steps: RouteStepWithChoices[]; // 全ルート+選択肢

  // 結果送信後のランキングデータ
  myRank: number | null;
  rankings: RankingEntry[];
  overallMyRank: number | null;
  overallRankings: RankingEntry[];

  // ゲーム進行状態
  lives: number;
  score: number;
  currentStage: number; // 0-indexed (steps配列のインデックスと対応)
  remainingTime: number; // 残り時間（0.1秒単位、100 = 10.0秒）
  falseSteps: number[]; // 間違えたステージのインデックス配列

  // ゲーム状態
  isPlaying: boolean;
  isCompleted: boolean; // ゲームクリアしたか

  // フィードバックフェーズ（回答後0.5秒の視覚フィードバック）
  isFeedbackPhase: boolean; // feedbackPhase中かどうか
  selectedAnswerId: number | null; // 選択された回答のID
  isLastAnswerCorrect: boolean | null; // 最後の回答が正解だったか

  // フィードバック表示
  showEdge: boolean; // エッジ説明を表示するか
  lastEdgeKeyword: string; // 最後に表示したエッジのキーワード
  lastEdgeExplanation: string; // 最後に表示したエッジの説明

  // アクション
  setPlayerName: (name: string) => void;
  loadGameData: (gameId: string, steps: RouteStepWithChoices[]) => void;
  setRankingData: (myRank: number, rankings: RankingEntry[], overallMyRank: number, overallRankings: RankingEntry[]) => void;
  requestStartGame: (difficulty: Difficulty, totalStages: number) => void;
  confirmStart: () => void;
  startGame: (difficulty: Difficulty, totalStages: number) => void;
  answerQuestion: (selectedTermId: number) => void;
  completeFeedbackPhase: () => void; // feedbackPhase終了後のステージ遷移
  decrementTimer: () => void;
  resetGame: () => void;
}

const INITIAL_LIVES = 3;
const MAX_TIME = 200; // 20.0秒 = 200 × 0.1秒
const DEFAULT_PLAYER_NAME = 'GUEST';

// スコア計算：残り時間のみ（0-100点）
const calculateScore = (remainingTime: number): number => {
  return Math.max(0, remainingTime);
};

export const useGameStore = create<GameState>((set, get) => ({
  // 初期状態
  playerName: DEFAULT_PLAYER_NAME,
  difficulty: 'normal',
  totalStages: 10,
  pendingStart: false,
  gameId: null,
  steps: [],
  myRank: null,
  rankings: [],
  overallMyRank: null,
  overallRankings: [],
  lives: INITIAL_LIVES,
  score: 0,
  currentStage: 0,
  remainingTime: 0,
  falseSteps: [],
  isPlaying: false,
  isCompleted: false,
  isFeedbackPhase: false,
  selectedAnswerId: null,
  isLastAnswerCorrect: null,
  showEdge: false,
  lastEdgeKeyword: '',
  lastEdgeExplanation: '',

  // プレイヤー名を設定
  setPlayerName: (name) => {
    const trimmedName = name.trim() || DEFAULT_PLAYER_NAME;
    set({ playerName: trimmedName });
  },

  // バックエンドから取得したゲームデータを読み込む
  loadGameData: (gameId, steps) => {
    set({
      gameId,
      steps,
      // totalStagesはstartGameで設定される（steps.length - 1）
    });
  },

  // ランキングデータを設定（結果送信後）
  setRankingData: (myRank, rankings, overallMyRank, overallRankings) => {
    set({ myRank, rankings, overallMyRank, overallRankings });
  },

  // ゲーム開始をリクエスト（ルール画面表示前）
  requestStartGame: (difficulty, totalStages) => {
    set({
      difficulty,
      totalStages,
      pendingStart: true,
    });
  },

  // ルール画面後、実際にゲームを開始
  confirmStart: () => {
    set({
      pendingStart: false,
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0,
      remainingTime: MAX_TIME,
      falseSteps: [],
      isPlaying: true,
      isCompleted: false,
    });
  },

  // ゲーム開始（GamePageから直接呼ばれる場合用）
  startGame: (difficulty, totalStages) => {
    set({
      difficulty,
      totalStages,
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0, // 0-indexed
      remainingTime: MAX_TIME,
      falseSteps: [],
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

    // 正解・不正解どちらもエッジ情報を即座に表示開始
    const showEdge = true;
    const lastEdgeKeyword = currentStep.keyword;
    const lastEdgeExplanation = currentStep.edge_description;

    // feedbackPhaseに入る（0.5秒間視覚フィードバック表示）
    set({
      isFeedbackPhase: true,
      selectedAnswerId: selectedTermId,
      isLastAnswerCorrect: isCorrect,
      showEdge,
      lastEdgeKeyword,
      lastEdgeExplanation,
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

    // 間違えた場合はfalseStepsに記録
    const newFalseSteps = isCorrect
      ? state.falseSteps
      : [...state.falseSteps, state.currentStage];

    // エッジ情報を継続表示（answerQuestionで設定済み）
    const showEdge = state.showEdge; // answerQuestionで設定した値をそのまま維持
    const lastEdgeKeyword = state.lastEdgeKeyword;
    const lastEdgeExplanation = state.lastEdgeExplanation;

    // ライフが0になったらゲームオーバー
    if (newLives <= 0) {
      set({
        lives: 0,
        falseSteps: newFalseSteps,
        isPlaying: false,
        isCompleted: false,
        isFeedbackPhase: false,
        selectedAnswerId: null,
        isLastAnswerCorrect: null,
        showEdge: false,
      });
      return;
    }

    // 最終ステージをクリアしたらゲーム完了
    // totalStagesはstartGameで設定された値を使用（steps.length - 1）
    // 最後のステップは回答不要（correct_next_id: null）なので、newStage >= totalStages でゲーム完了
    if (isCorrect && newStage >= state.totalStages) {
      set({
        score: newScore,
        lives: newLives,
        currentStage: state.totalStages - 1, // 最終ステージ（COMPLETE表示用: currentStage + 1 === totalStages）
        isPlaying: false,
        isCompleted: true,
        isFeedbackPhase: false,
        selectedAnswerId: null,
        isLastAnswerCorrect: null,
        showEdge,
        lastEdgeKeyword,
        lastEdgeExplanation,
      });
      return;
    }

    // 次のステージへ（タイマーリセット）
    set({
      score: newScore,
      lives: newLives,
      currentStage: newStage,
      remainingTime: MAX_TIME,
      falseSteps: newFalseSteps,
      isFeedbackPhase: false,
      selectedAnswerId: null,
      isLastAnswerCorrect: null,
      showEdge,
      lastEdgeKeyword,
      lastEdgeExplanation,
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
        showEdge: false, // タイムアウト時はedge表示なし
      });
      return;
    }

    set({ remainingTime: newRemainingTime });
  },

  // ゲームリセット
  resetGame: () => {
    set({
      playerName: DEFAULT_PLAYER_NAME,
      difficulty: 'normal',
      totalStages: 10,
      pendingStart: false,
      gameId: null,
      steps: [],
      myRank: null,
      rankings: [],
      overallMyRank: null,
      overallRankings: [],
      lives: INITIAL_LIVES,
      score: 0,
      currentStage: 0,
      remainingTime: 0,
      falseSteps: [],
      isPlaying: false,
      isCompleted: false,
      isFeedbackPhase: false,
      selectedAnswerId: null,
      isLastAnswerCorrect: null,
      showEdge: false,
      lastEdgeKeyword: '',
      lastEdgeExplanation: '',
    });
  },
}));
