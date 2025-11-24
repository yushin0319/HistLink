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
    relation_type: '統治者',
    keyword: '女王卑弥呼',
    relation_description: '邪馬台国を統治した女王',
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
    relation_type: '時代変化',
    keyword: '律令制度',
    relation_description: '大化の改新により律令制度が導入された',
  },
  {
    step_no: 2,
    term: { id: 6, name: '大化の改新', era: '飛鳥時代', tags: [], description: '' },
    correct_next_id: null, // 最後のステップ
    choices: [],
    relation_type: '',
    keyword: '',
    relation_description: '',
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
      expect(state.isFeedbackPhase).toBe(false);
      expect(state.selectedAnswerId).toBeNull();
      expect(state.isLastAnswerCorrect).toBeNull();
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

    it('stepsがundefinedの場合、totalStagesはデフォルト値10になる', () => {
      const { loadGameData } = useGameStore.getState();

      // @ts-expect-error: テスト用にundefinedを渡す
      loadGameData('test-game-id', 123, undefined);
      const state = useGameStore.getState();

      expect(state.totalStages).toBe(10); // デフォルト値
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
      expect(state.currentStage).toBe(0); // 0-indexed
      expect(state.remainingTime).toBe(200); // 20.0秒 = 200 × 0.1秒
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

    it('正解したらfeedbackPhaseに入る', () => {
      const { answerQuestion } = useGameStore.getState();

      // ステップ0: 正解は2（卑弥呼）
      answerQuestion(2);
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(2);
      expect(state.isLastAnswerCorrect).toBe(true);
      expect(state.showRelation).toBe(true); // 正解・不正解どちらも即座に表示
      expect(state.lastRelationKeyword).toBe('女王卑弥呼');
      expect(state.currentStage).toBe(0); // まだ遷移していない
    });

    it('不正解したらfeedbackPhaseに入り、relation表示が開始される', () => {
      const { answerQuestion } = useGameStore.getState();

      // ステップ0: 正解は2だが、3を選択
      answerQuestion(3);
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(3);
      expect(state.isLastAnswerCorrect).toBe(false);
      expect(state.showRelation).toBe(true); // 不正解時は即座に表示
      expect(state.lastRelationKeyword).toBe('女王卑弥呼');
      expect(state.currentStage).toBe(0); // まだ遷移していない
    });

    it('feedbackPhase中は追加の回答を受け付けない', () => {
      const { answerQuestion } = useGameStore.getState();

      // 最初の回答
      answerQuestion(2);
      const stateAfterFirst = useGameStore.getState();
      expect(stateAfterFirst.isFeedbackPhase).toBe(true);

      // feedbackPhase中に別の回答を試みる
      answerQuestion(3);
      const stateAfterSecond = useGameStore.getState();

      // 状態が変わらないことを確認
      expect(stateAfterSecond.selectedAnswerId).toBe(2); // 最初の回答のまま
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

    it('currentStageが範囲外の時は何も起きない', () => {
      const { loadGameData, startGame, answerQuestion } = useGameStore.getState();
      loadGameData('test-game-id', 123, mockSteps);
      startGame('normal', 3);

      // currentStageを強制的に範囲外に設定
      useGameStore.setState({ currentStage: 999 });

      answerQuestion(2);
      const state = useGameStore.getState();

      // feedbackPhaseに入らないことを確認
      expect(state.isFeedbackPhase).toBe(false);
    });
  });

  describe('completeFeedbackPhase', () => {
    beforeEach(() => {
      const { loadGameData, startGame } = useGameStore.getState();
      loadGameData('test-game-id', 123, mockSteps);
      startGame('normal', 3);
    });

    it('正解後feedbackPhaseを完了すると次のステージに進む', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      // 正解を選択してfeedbackPhaseに入る
      answerQuestion(2);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      // feedbackPhaseを完了
      completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(false);
      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(200);
      expect(state.remainingTime).toBe(200); // リセット
      expect(state.showRelation).toBe(true); // 正解時はfeedbackPhase後に表示
      expect(state.lastRelationKeyword).toBe('女王卑弥呼');
    });

    it('不正解後feedbackPhaseを完了するとライフが減る', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      // 不正解を選択してfeedbackPhaseに入る
      answerQuestion(3);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      // feedbackPhaseを完了
      completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.isFeedbackPhase).toBe(false);
      expect(state.currentStage).toBe(1);
      expect(state.lives).toBe(2);
      expect(state.score).toBe(0); // スコア加算なし
      expect(state.showRelation).toBe(true); // 不正解時もrelation継続表示
      expect(state.lastRelationKeyword).toBe('女王卑弥呼');
    });

    it('残り時間に応じてスコアが変動する', () => {
      const store = useGameStore.getState();

      // 5秒経過（50 × 0.1秒）
      for (let i = 0; i < 50; i++) {
        store.decrementTimer();
      }

      // 残り時間150で正解
      store.answerQuestion(2);
      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.score).toBe(150); // 残り時間150 = 150点
    });

    it('ライフが0になったらゲームオーバー', () => {
      const { answerQuestion, completeFeedbackPhase } = useGameStore.getState();

      // 3回不正解
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

      // ステップ0, 1を正解で進む
      answerQuestion(2);
      completeFeedbackPhase();
      answerQuestion(6);
      completeFeedbackPhase();

      const state = useGameStore.getState();

      expect(state.currentStage).toBe(2);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(true);
      expect(state.isFeedbackPhase).toBe(false);
      expect(state.score).toBe(400); // 200 + 200
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
      loadGameData('test-game-id', 123, mockSteps);
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

      // feedbackPhaseに入る
      store.answerQuestion(2);
      expect(useGameStore.getState().isFeedbackPhase).toBe(true);

      const timeBeforeDecrement = useGameStore.getState().remainingTime;

      // タイマーを減らそうとする
      store.decrementTimer();
      const state = useGameStore.getState();

      // タイマーが減らないことを確認
      expect(state.remainingTime).toBe(timeBeforeDecrement);
    });

    it('タイマーが0になったらfeedbackPhaseに入る', () => {
      const store = useGameStore.getState();

      // タイマーを0にする（200回 × 0.1秒 = 20秒）
      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      const state = useGameStore.getState();

      expect(state.remainingTime).toBe(0);
      expect(state.isFeedbackPhase).toBe(true);
      expect(state.selectedAnswerId).toBe(2); // 正解カード
      expect(state.isLastAnswerCorrect).toBe(false); // タイムアウトは不正解扱い
      expect(state.showRelation).toBe(false); // タイムアウト時はrelation表示なし
    });

    it('タイムアウト後feedbackPhaseを完了するとライフが減る', () => {
      const store = useGameStore.getState();

      // タイマーを0にする
      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      // feedbackPhaseを完了
      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.lives).toBe(2);
      expect(state.remainingTime).toBe(200); // リセット
      expect(state.currentStage).toBe(1);
      expect(state.isFeedbackPhase).toBe(false);
    });

    it('タイマー0＋feedbackPhase完了でライフ0ならゲームオーバー', () => {
      const store = useGameStore.getState();

      // ライフを1にする
      store.answerQuestion(999);
      store.completeFeedbackPhase();
      store.answerQuestion(999);
      store.completeFeedbackPhase();

      // タイマーを0にする
      for (let i = 0; i < 200; i++) {
        store.decrementTimer();
      }

      // feedbackPhaseを完了
      store.completeFeedbackPhase();
      const state = useGameStore.getState();

      expect(state.lives).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isCompleted).toBe(false);
      expect(state.isFeedbackPhase).toBe(false);
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
      const { loadGameData, startGame, answerQuestion, completeFeedbackPhase, resetGame } =
        useGameStore.getState();

      loadGameData('test-game-id', 123, mockSteps);
      startGame('hard', 3);
      answerQuestion(2);
      completeFeedbackPhase();
      answerQuestion(6);
      completeFeedbackPhase();

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
      expect(state.isFeedbackPhase).toBe(false);
      expect(state.selectedAnswerId).toBeNull();
      expect(state.isLastAnswerCorrect).toBeNull();
    });
  });
});
