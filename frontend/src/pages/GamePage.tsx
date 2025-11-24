import { useEffect, useState } from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { startGameSession, submitGameResult } from '../services/gameApi';
import GameCard from '../components/GameCard';
import ChoiceCard from '../components/ChoiceCard';
import GameHeader from '../components/GameHeader';
import RelationDisplay from '../components/RelationDisplay';

export default function GamePage() {
  const {
    difficulty,
    totalStages,
    lives,
    score,
    currentStage,
    remainingTime,
    isPlaying,
    isCompleted,
    steps,
    gameId,
    showRelation,
    lastRelationKeyword,
    lastRelationExplanation,
    isFeedbackPhase,
    selectedAnswerId,
    isLastAnswerCorrect,
    loadGameData,
    startGame,
    answerQuestion,
    completeFeedbackPhase,
    decrementTimer,
  } = useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);

  // feedbackPhaseが開始されたら0.5秒後にcompleteFeedbackPhaseを呼び出す
  useEffect(() => {
    if (isFeedbackPhase) {
      console.log('[GamePage] feedbackPhase started, will complete in 0.5s');
      const timer = setTimeout(() => {
        console.log('[GamePage] completing feedbackPhase');
        completeFeedbackPhase();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isFeedbackPhase, completeFeedbackPhase]);

  // リレーション表示を3.5秒後に非表示にする
  // 不正解時はfeedbackPhase中（0.5秒）から表示開始されるため、合計4秒
  // 正解時はfeedbackPhase終了後から表示開始されるため、合計4秒（0.5秒 + 3.5秒）
  useEffect(() => {
    console.log('[GamePage] showRelation changed:', showRelation, 'keyword:', lastRelationKeyword, 'explanation:', lastRelationExplanation);
    if (showRelation) {
      const timer = setTimeout(() => {
        console.log('[GamePage] Hiding relation after 3.5 seconds');
        useGameStore.setState({ showRelation: false });
      }, 3500);

      return () => {
        console.log('[GamePage] Clearing timer');
        clearTimeout(timer);
      };
    }
  }, [showRelation, lastRelationKeyword, lastRelationExplanation]); // 関連する値が変わったら再実行

  // ゲームセッション開始（全ルート+選択肢を一括取得）
  useEffect(() => {
    const initGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // バックエンドから全ルート+選択肢を取得
        const response = await startGameSession(difficulty, totalStages);

        // Zustandに読み込む（totalStagesはresponse.steps.lengthで設定される）
        loadGameData(response.game_id, response.route_id, response.steps);

        // ゲーム開始（totalStagesはloadGameDataで設定済みなので、実際のステップ数を使用）
        startGame(difficulty, response.steps.length);
      } catch (err) {
        setError('エラーが発生しました');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initGame();
  }, [difficulty, totalStages, loadGameData, startGame]);

  // タイマー管理（0.1秒ごと）
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      decrementTimer();
    }, 100); // 0.1秒 = 100ms

    return () => clearInterval(intervalId);
  }, [isPlaying, decrementTimer]);

  // ゲーム終了時に結果を送信
  useEffect(() => {
    if (!isPlaying && gameId && !hasSubmittedResult && (isCompleted || lives === 0)) {
      const submitResult = async () => {
        try {
          await submitGameResult(gameId, {
            final_score: score,
            final_lives: lives,
            is_completed: isCompleted,
          });
          setHasSubmittedResult(true);
        } catch (err) {
          console.error('結果送信エラー:', err);
        }
      };

      submitResult();
    }
  }, [isPlaying, gameId, score, lives, isCompleted, hasSubmittedResult]);

  // 回答送信（フロントエンドで処理）
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
        <Typography variant="h5" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  // ゲームオーバー/クリア画面
  if (!isPlaying && (isCompleted || lives === 0)) {
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
          <Typography variant="h3" gutterBottom>
            {isCompleted ? 'ゲームクリア！' : 'ゲームオーバー'}
          </Typography>
          <Typography variant="h5">最終スコア: {score}点</Typography>
          <Typography variant="h6">残りライフ: {lives}</Typography>
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
      }}
    >
      <Container maxWidth="md">
        {/* ゲーム情報ヘッダー（2×2グリッド） */}
        <GameHeader
          lives={lives}
          score={score}
          currentStage={currentStage}
          totalStages={totalStages}
          remainingTime={remainingTime}
        />

        {/* 現在の問題 */}
        {currentStep && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <GameCard
              term={currentStep.term.name}
              era={currentStep.term.era}
              description={currentStep.term.description}
            />
          </Box>
        )}

        {/* 選択肢（2×2グリッド） */}
        {currentStep && currentStep.choices.length > 0 && (
          <Grid container spacing={2}>
            {currentStep.choices.map((choice) => {
              // feedbackState判定
              let feedbackState: 'correct' | 'incorrect' | null = null;
              if (isFeedbackPhase && selectedAnswerId !== null) {
                if (choice.term_id === currentStep.correct_next_id) {
                  // 正解カードは常に緑
                  feedbackState = 'correct';
                } else if (choice.term_id === selectedAnswerId) {
                  // 選択された不正解カードは赤
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

        {/* リレーション説明（正解時に表示） */}
        <RelationDisplay
          keyword={lastRelationKeyword}
          explanation={lastRelationExplanation}
          show={showRelation}
        />
      </Container>
    </Box>
  );
}
