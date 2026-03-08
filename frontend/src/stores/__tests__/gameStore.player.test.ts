import { beforeEach, describe, expect, it } from 'vitest';
import type { RouteStepWithChoices } from '../../types/api';
import { useGameStore } from '../gameStore';

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
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('gameStore - resetGame', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('ゲーム状態を初期化できる', () => {
    const {
      loadGameData,
      startGame,
      answerQuestion,
      completeFeedbackPhase,
      resetGame,
    } = useGameStore.getState();

    loadGameData('test-game-id', mockSteps);
    startGame('hard', 1);
    answerQuestion(2);
    completeFeedbackPhase();

    resetGame();
    const state = useGameStore.getState();

    expect(state.playerName).toBe('GUEST');
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

  it('名前を変更後リセットすると初期値に戻る', () => {
    const { setPlayerName, resetGame } = useGameStore.getState();

    setPlayerName('カスタム名前');
    expect(useGameStore.getState().playerName).toBe('カスタム名前');

    resetGame();
    expect(useGameStore.getState().playerName).toBe('GUEST');
  });
});

describe('gameStore - playerName', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('初期値はデフォルト名', () => {
    const state = useGameStore.getState();
    expect(state.playerName).toBeDefined();
  });

  it('setPlayerNameで名前を変更できる', () => {
    const { setPlayerName } = useGameStore.getState();

    setPlayerName('テストユーザー');
    const state = useGameStore.getState();

    expect(state.playerName).toBe('テストユーザー');
  });

  it('空文字を設定するとデフォルト名になる', () => {
    const { setPlayerName } = useGameStore.getState();

    setPlayerName('');
    const state = useGameStore.getState();

    expect(state.playerName).toBe('GUEST');
  });

  it('空白のみを設定するとデフォルト名になる', () => {
    const { setPlayerName } = useGameStore.getState();

    setPlayerName('   ');
    const state = useGameStore.getState();

    expect(state.playerName).toBe('GUEST');
  });

  it('前後の空白はトリムされる', () => {
    const { setPlayerName } = useGameStore.getState();

    setPlayerName('  名前  ');
    const state = useGameStore.getState();

    expect(state.playerName).toBe('名前');
  });
});

describe('gameStore - setRankingData', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('ランキングデータを設定できる', () => {
    const { setRankingData } = useGameStore.getState();

    const rankings = [
      { rank: 1, user_name: 'たろう', score: 1800, cleared_steps: 10 },
      { rank: 2, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
    ];

    setRankingData(1, rankings, 1, []);
    const state = useGameStore.getState();

    expect(state.myRank).toBe(1);
    expect(state.rankings).toEqual(rankings);
    expect(state.rankings).toHaveLength(2);
  });

  it('ランキングデータを更新できる', () => {
    const { setRankingData } = useGameStore.getState();

    const initialRankings = [
      { rank: 1, user_name: 'たろう', score: 1800, cleared_steps: 10 },
    ];
    setRankingData(2, initialRankings, 2, []);

    const updatedRankings = [
      { rank: 1, user_name: '新トップ', score: 2000, cleared_steps: 10 },
      { rank: 2, user_name: 'たろう', score: 1800, cleared_steps: 10 },
    ];
    setRankingData(1, updatedRankings, 1, []);
    const state = useGameStore.getState();

    expect(state.myRank).toBe(1);
    expect(state.rankings).toEqual(updatedRankings);
  });
});
