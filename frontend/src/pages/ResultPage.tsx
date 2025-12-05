import { useState, useEffect } from 'react';
import { Box, Container, Button, Fade } from '@mui/material';
import ResultHeader from '../components/ResultHeader';
import RankingTable from '../components/RankingTable';
import RouteReviewModal from '../components/RouteReviewModal';
import BackgroundImage from '../components/BackgroundImage';
import { useGameStore } from '../stores/gameStore';

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
    resetGame,
  } = useGameStore();

  const [lives, setLives] = useState(initialLives);
  const [score, setScore] = useState(initialScore);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [showContent, setShowContent] = useState(false); // ライフ換金完了後にtrue

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

    const startTime = Date.now();
    console.log('[START] 0ms: アニメーション開始');

    let currentLifeIndex = 0;

    const processNextLife = () => {
      if (!animationState.isRunning || currentLifeIndex >= initialLives) {
        return;
      }

      const lifeNumber = currentLifeIndex + 1;
      console.log(`[LIFE] ${Date.now() - startTime}ms: ライフ${lifeNumber}消費開始`);

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
          console.log(`[COUNT] ${Date.now() - startTime}ms: カウントアップ${lifeNumber}完了`);
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
          console.log(`[FINAL] ${Date.now() - startTime}ms: 最終スコア表示`);
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
    resetGame();
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
            <RankingTable
              totalStages={totalStages}
              currentUserScore={score}
              onShowRoute={() => setIsRouteModalOpen(true)}
            />
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
        />
      </Container>
    </Box>
  );
}
