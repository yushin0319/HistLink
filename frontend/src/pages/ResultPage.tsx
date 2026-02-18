import { useState, useEffect, useRef } from 'react';
import { Box, Container, Button, Fade, CircularProgress, Snackbar, Alert } from '@mui/material';
import ResultHeader from '../components/ResultHeader';
import RankingTable from '../components/RankingTable';
import RouteReviewModal from '../components/RouteReviewModal';
import BackgroundImage from '../components/BackgroundImage';
import { useGameStore } from '../stores/gameStore';
import { updateGame, submitGameResult, getOverallRanking } from '../services/gameApi';

const BONUS_POINTS = {
  easy: 100,
  normal: 200,
  hard: 300,
} as const;

// モジュールスコープでアニメーション状態を管理（StrictMode対策）
let animationState: {
  isRunning: boolean;
  gameId: string | null;
  timers: ReturnType<typeof setTimeout>[];
  intervals: ReturnType<typeof setInterval>[];
} = {
  isRunning: false,
  gameId: null,
  timers: [],
  intervals: [],
};

function clearAnimationTimers() {
  animationState.timers.forEach(clearTimeout);
  animationState.intervals.forEach(clearInterval);
  animationState.timers = [];
  animationState.intervals = [];
}

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

  const [lives, setLives] = useState(initialLives);
  const [score, setScore] = useState(initialScore);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [showContent, setShowContent] = useState(false); // ライフ換金完了後にtrue
  const [submitError, setSubmitError] = useState(false); // 結果送信エラー通知
  const hasSubmittedResult = useRef(false);

  // ゲーム結果送信（マウント時に1回だけ）
  useEffect(() => {
    if (!gameId || hasSubmittedResult.current) return;

    const submitResult = async () => {
      try {
        hasSubmittedResult.current = true;
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

        // サーバーが確定したfinal_scoreで全体ランキングを取得
        const overallResponse = await getOverallRanking(stageResponse.final_score);

        setRankingData(
          stageResponse.my_rank,
          stageResponse.rankings,
          overallResponse.my_rank,
          overallResponse.rankings
        );
      } catch (err) {
        console.error('結果送信エラー:', err);
        hasSubmittedResult.current = false; // リトライ可能にする
        setSubmitError(true);
      }
    };

    submitResult();
  }, [gameId, initialScore, initialLives, currentStage, totalStages, isCompleted, playerName, falseSteps, difficulty, setRankingData]);

  useEffect(() => {
    // ゲームオーバー（ライフ0）の場合はアニメーションなし、即座にコンテンツ表示
    if (initialLives === 0) {
      setLives(0);
      setScore(initialScore);
      setShowContent(true);
      return;
    }

    // 同じゲームIDで既にアニメーション中ならスキップ
    if (animationState.isRunning && animationState.gameId === gameId) {
      return;
    }

    // 新しいゲームの場合は前のタイマーをクリア
    if (animationState.gameId !== gameId) {
      clearAnimationTimers();
    }

    animationState.isRunning = true;
    animationState.gameId = gameId;

    setLives(initialLives);
    setScore(initialScore);

    let currentLifeIndex = 0;

    const processNextLife = () => {
      if (!animationState.isRunning || currentLifeIndex >= initialLives) {
        return;
      }

      const bonusPoints = BONUS_POINTS[difficulty];
      const countUpSteps = bonusPoints / 10;
      const countUpDuration = 500;
      const intervalPerStep = countUpDuration / countUpSteps;

      let currentCount = 0;
      const countUpInterval = setInterval(() => {
        if (!animationState.isRunning) return;

        currentCount++;
        setScore((prev) => prev + 10);

        if (currentCount >= countUpSteps) {
          clearInterval(countUpInterval);
          setLives((prev) => Math.max(0, prev - 1));
        }
      }, intervalPerStep);
      animationState.intervals.push(countUpInterval);

      currentLifeIndex++;

      if (currentLifeIndex < initialLives) {
        const nextLifeTimer = setTimeout(() => {
          if (animationState.isRunning) processNextLife();
        }, 600);
        animationState.timers.push(nextLifeTimer);
      } else {
        const finalTimer = setTimeout(() => {
          if (!animationState.isRunning) return;
          setShowContent(true);
        }, 500);
        animationState.timers.push(finalTimer);
      }
    };

    processNextLife();

    // クリーンアップではタイマーをクリアしない（StrictMode対策）
    // 実際のクリーンアップは新しいゲーム開始時に行う
  }, [initialLives, initialScore, difficulty, gameId]);

  const handleRetry = () => {
    // アニメーション状態をリセット
    animationState.isRunning = false;
    clearAnimationTimers();
    // 結果送信フラグをリセット
    hasSubmittedResult.current = false;
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
      overallResponse.rankings
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
