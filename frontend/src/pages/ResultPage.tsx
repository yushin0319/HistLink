import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Fade,
  Snackbar,
} from '@mui/material';
import { useEffect, useState } from 'react';
import BackgroundImage from '../components/BackgroundImage';
import RankingTable from '../components/RankingTable';
import ResultHeader from '../components/ResultHeader';
import RouteReviewModal from '../components/RouteReviewModal';
import { useCountUpAnimation } from '../hooks/useCountUpAnimation';
import {
  getOverallRanking,
  submitGameResult,
  updateGame,
} from '../services/gameApi';
import { useGameStore } from '../stores/gameStore';

export default function ResultPage() {
  const {
    lives: initialLives,
    score: initialScore,
    difficulty,
    currentStage,
    totalStages,
    steps,
    gameId,
    playerName,
    isCompleted,
    myRank,
    rankings,
    overallMyRank,
    overallRankings,
    falseSteps,
    setRankingData,
    resetGame,
  } = useGameStore();

  const {
    lives,
    score,
    showContent,
    stop: stopAnimation,
  } = useCountUpAnimation({
    initialLives,
    initialScore,
    difficulty,
  });

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState(false); // 結果送信エラー通知

  // #5: ゲーム結果送信（cleanup関数でキャンセル対応）
  useEffect(() => {
    if (!gameId) return;
    let active = true;

    const submitResult = async () => {
      try {
        // cleared_steps: ゲームオーバーの場合はcurrentStage、クリアの場合はtotalStages
        const clearedSteps = isCompleted ? totalStages : currentStage;

        // 素点（ライフボーナスなし）を送信し、ライフボーナスはサーバーが計算
        const stageResponse = await submitGameResult(gameId, {
          base_score: initialScore,
          final_lives: initialLives,
          cleared_steps: clearedSteps,
          user_name: playerName,
          false_steps: falseSteps,
        });
        if (!active) return;

        // サーバーが確定したfinal_scoreで全体ランキングを取得
        const overallResponse = await getOverallRanking(
          stageResponse.final_score,
        );
        if (!active) return;

        setRankingData(
          stageResponse.my_rank,
          stageResponse.rankings,
          overallResponse.my_rank,
          overallResponse.rankings,
        );
      } catch (err) {
        if (!active) return;
        console.error('結果送信エラー:', err);
        setSubmitError(true);
      }
    };

    submitResult();
    return () => {
      active = false;
    };
  }, [
    gameId,
    initialScore,
    initialLives,
    currentStage,
    totalStages,
    isCompleted,
    playerName,
    falseSteps,
    setRankingData,
  ]);

  const handleRetry = () => {
    stopAnimation();
    resetGame();
  };

  // 名前変更時のAPI呼び出し
  const handleNameChange = async (newName: string) => {
    if (!gameId) return;
    // X問ランキング更新（DB更新）を先に完了させてから全体ランキングを取得
    const stageResponse = await updateGame(gameId, { user_name: newName });
    const overallResponse = await getOverallRanking(score);
    // 両方のランキングデータを更新
    setRankingData(
      stageResponse.my_rank,
      stageResponse.rankings,
      overallResponse.my_rank,
      overallResponse.rankings,
    );
  };

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
        {/* 結果ヘッダー */}
        <ResultHeader
          lives={lives}
          score={score}
          currentStage={currentStage}
          totalStages={totalStages}
        />

        {/* ランキング（ライフ換金完了後にフェードイン） */}
        <Fade in={showContent} timeout={500}>
          <Box sx={{ mt: 2 }}>
            {myRank === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <RankingTable
                totalStages={totalStages}
                currentUserScore={score}
                currentUserRank={myRank}
                rankings={rankings}
                overallRankings={overallRankings}
                overallMyRank={overallMyRank ?? 1}
                gameId={gameId ?? ''}
                onNameChange={handleNameChange}
                onShowRoute={() => setIsRouteModalOpen(true)}
              />
            )}
          </Box>
        </Fade>

        {/* もう一度プレイボタン（ライフ換金完了後にフェードイン） */}
        <Fade in={showContent} timeout={500}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleRetry}
              sx={{
                px: 8,
                py: 2,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                borderRadius: 3,
                boxShadow: 4,
                color: 'white',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
            >
              もう一度プレイ
            </Button>
          </Box>
        </Fade>

        {/* ルートおさらいモーダル */}
        <RouteReviewModal
          open={isRouteModalOpen}
          onClose={() => setIsRouteModalOpen(false)}
          steps={steps}
          falseSteps={falseSteps}
        />
      </Container>

      {/* 結果送信エラー通知 */}
      <Snackbar
        open={submitError}
        autoHideDuration={6000}
        onClose={() => setSubmitError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSubmitError(false)}>
          結果の保存に失敗しました。リロードして再度お試しください。
        </Alert>
      </Snackbar>
    </Box>
  );
}
