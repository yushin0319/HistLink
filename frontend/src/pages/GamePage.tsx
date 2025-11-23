import { useEffect, useState } from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { startGameSession, submitAnswer } from '../services/gameApi';
import type { GameStartResponse, GameAnswerResponse, Term, TermOption } from '../types/api';
import GameCard from '../components/GameCard';
import ChoiceCard from '../components/ChoiceCard';

export default function GamePage() {
  const { difficulty, totalStages, lives, score, currentStage, remainingTime, answerQuestion } =
    useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [options, setOptions] = useState<TermOption[]>([]);

  // ゲームセッション開始
  useEffect(() => {
    const initGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response: GameStartResponse = await startGameSession(difficulty, totalStages);

        setSessionId(response.session_id);
        setCurrentTerm(response.current_term);
        setOptions(response.options);
      } catch (err) {
        setError('エラーが発生しました');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initGame();
  }, [difficulty, totalStages]);

  // 回答送信
  const handleAnswer = async (selectedTermId: number) => {
    if (!sessionId) return;

    try {
      const response: GameAnswerResponse = await submitAnswer(
        sessionId,
        selectedTermId,
        remainingTime
      );

      // gameStore を更新
      answerQuestion(response.is_correct);

      // 次の問題を表示（ゲームオーバーでない場合）
      if (!response.is_game_over && response.next_term) {
        setCurrentTerm(response.next_term);
        setOptions(response.next_options);
      }
    } catch (err) {
      setError('回答の送信に失敗しました');
      console.error(err);
    }
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* ゲーム情報 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            mb: 4,
          }}
        >
          <Typography variant="h6">ライフ: {lives}</Typography>
          <Typography variant="h6">スコア: {score}</Typography>
          <Typography variant="h6">
            ステージ: {currentStage} / {totalStages}
          </Typography>
          <Typography variant="h6">
            タイマー: {(remainingTime / 10).toFixed(1)}秒
          </Typography>
        </Box>

        {/* 現在の問題 */}
        {currentTerm && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <GameCard
              term={currentTerm.name}
              era={currentTerm.era}
              description={currentTerm.description}
            />
          </Box>
        )}

        {/* 選択肢 */}
        <Grid container spacing={2}>
          {options.map((option) => (
            <Grid item xs={6} key={option.id}>
              <ChoiceCard term={option.name} onClick={() => handleAnswer(option.id)} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
