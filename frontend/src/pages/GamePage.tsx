import { useEffect, useState, useRef } from 'react';
import { Box, Button, Container, Typography, Grid } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { startGameSession } from '../services/gameApi';
import GameCard from '../components/GameCard';
import ChoiceCard from '../components/ChoiceCard';
import GameHeader from '../components/GameHeader';
import EdgeDisplay from '../components/EdgeDisplay';
import BackgroundImage from '../components/BackgroundImage';

export default function GamePage() {
  const {
    difficulty,
    totalStages,
    lives,
    score,
    currentStage,
    remainingTime,
    isPlaying,
    isTimedOut,
    steps,
    gameId,
    showEdge,
    lastEdgeKeyword,
    lastEdgeExplanation,
    isFeedbackPhase,
    selectedAnswerId,
    loadGameData,
    startGame,
    answerQuestion,
    completeFeedbackPhase,
    decrementTimer,
    resetGame,
  } = useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasInitialized = useRef(false);

  const handleRetry = () => {
    hasInitialized.current = false;
    setRetryCount((c) => c + 1);
  };

  // feedbackPhaseが開始されたら0.5秒後にcompleteFeedbackPhaseを呼び出す
  useEffect(() => {
    if (isFeedbackPhase) {
      const timer = setTimeout(() => {
        completeFeedbackPhase();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isFeedbackPhase, completeFeedbackPhase]);

  // エッジ表示を3.5秒後に非表示にする
  useEffect(() => {
    if (showEdge) {
      const timer = setTimeout(() => {
        useGameStore.setState({ showEdge: false });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [showEdge, lastEdgeKeyword, lastEdgeExplanation]);

  // ゲームセッション開始（全ルート+選択肢を一括取得）- 初回のみ
  useEffect(() => {
    // 既に初期化済み、またはgameIdがある場合はスキップ
    if (hasInitialized.current || gameId) {
      setIsLoading(false);
      return;
    }

    hasInitialized.current = true;

    const initGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // バックエンドから全ルート+選択肢を取得
        const response = await startGameSession(difficulty, totalStages);

        // Zustandに読み込む
        loadGameData(response.game_id, response.steps);

        // ゲーム開始（ステップ数 = ノード数 - 1）
        startGame(difficulty, response.steps.length - 1);
      } catch (err) {
        setError('エラーが発生しました');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initGame();
  }, [difficulty, totalStages, gameId, loadGameData, startGame, retryCount]);

  // タイマー管理（0.1秒ごと）
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      decrementTimer();
    }, 100);

    return () => clearInterval(intervalId);
  }, [isPlaying, decrementTimer]);

  // 回答送信
  const handleAnswer = (selectedTermId: number) => {
    answerQuestion(selectedTermId);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h5">読み込み中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            エラーが発生しました
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            データの読み込みに失敗しました。
          </Typography>
          <Button variant="contained" onClick={handleRetry} sx={{ mr: 1 }}>
            リトライ
          </Button>
          <Button variant="outlined" onClick={resetGame}>
            ホームに戻る
          </Button>
        </Box>
      </Box>
    );
  }

  // 現在のステップを取得
  const currentStep = steps[currentStage];

  // stepsがロードされていない場合はローディング表示
  if (!currentStep) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h5">読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BackgroundImage />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        {/* ゲーム情報ヘッダー */}
        <GameHeader
          lives={lives}
          score={score}
          currentStage={currentStage}
          totalStages={totalStages}
          remainingTime={remainingTime}
        />

        {/* 現在の問題 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <GameCard
            term={currentStep.term.name}
            category={currentStep.term.category}
            description={currentStep.term.description}
          />
        </Box>

        {/* タイムアウト表示 */}
        {isFeedbackPhase && isTimedOut && (
          <Typography
            variant="h5"
            color="error"
            align="center"
            sx={{ mb: 1, fontWeight: 'bold' }}
          >
            時間切れ！
          </Typography>
        )}

        {/* 選択肢（2×2グリッド） */}
        {currentStep.choices.length > 0 && (
          <Grid container spacing={2}>
            {currentStep.choices.map((choice) => {
              // feedbackState判定
              let feedbackState: 'correct' | 'incorrect' | null = null;
              if (isFeedbackPhase && selectedAnswerId !== null) {
                if (choice.term_id === currentStep.correct_next_id) {
                  feedbackState = 'correct';
                } else if (choice.term_id === selectedAnswerId) {
                  feedbackState = 'incorrect';
                }
              }

              return (
                <Grid size={{ xs: 6 }} key={choice.term_id}>
                  <ChoiceCard
                    term={choice.name}
                    onClick={() => handleAnswer(choice.term_id)}
                    feedbackState={feedbackState}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* エッジ説明 */}
        <EdgeDisplay
          keyword={lastEdgeKeyword}
          explanation={lastEdgeExplanation}
          show={showEdge}
        />
      </Container>
    </Box>
  );
}
