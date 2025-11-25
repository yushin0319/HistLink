import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import ResultHeader from '../components/ResultHeader';

const BONUS_POINTS = {
  easy: 100,
  normal: 200,
  hard: 300,
} as const;

interface ResultPageProps {
  initialLives?: number;
  initialScore?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export default function ResultPage({
  initialLives = 3,
  initialScore = 2332,
  difficulty = 'hard'
}: ResultPageProps = {}) {
  const [lives, setLives] = useState(initialLives);
  const [score, setScore] = useState(initialScore);

  // 初期化フラグ
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initialLives === 0) {
      return;
    }

    if (isInitialized) {
      return;
    }

    setIsInitialized(true);

    // 初期値をリセット
    setLives(initialLives);
    setScore(initialScore);

    const startTime = Date.now();
    console.log('[START] 0ms: アニメーション開始');

    let isComplete = false;
    let currentLifeIndex = 0;
    const timers: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];

    // 各ライフを順番に処理する関数
    const processNextLife = () => {
      if (isComplete || currentLifeIndex >= initialLives) {
        return;
      }

      const lifeNumber = currentLifeIndex + 1;
      console.log(`[LIFE] ${Date.now() - startTime}ms: ライフ${lifeNumber}消費開始`);

      // スコアカウントアップ開始（0.5秒で完了）
      const bonusPoints = BONUS_POINTS[difficulty];
      const countUpSteps = bonusPoints / 10; // 10点刻み
      const countUpDuration = 500; // 0.5秒
      const intervalPerStep = countUpDuration / countUpSteps;

      let currentCount = 0;
      const countUpInterval = setInterval(() => {
        if (isComplete) return;

        currentCount++;
        setScore((prev) => prev + 10);

        if (currentCount >= countUpSteps) {
          clearInterval(countUpInterval);
          console.log(`[COUNT] ${Date.now() - startTime}ms: カウントアップ${lifeNumber}完了`);
          // カウントアップ完了後にライフを減らす
          setLives((prev) => Math.max(0, prev - 1));
        }
      }, intervalPerStep);
      intervals.push(countUpInterval);

      currentLifeIndex++;

      // 次のライフがあれば0.6秒後に処理（0.5秒カウント + 0.1秒待機）、なければ終了
      if (currentLifeIndex < initialLives) {
        const nextLifeTimer = setTimeout(() => {
          if (!isComplete) processNextLife();
        }, 600);
        timers.push(nextLifeTimer);
      } else {
        // 最後のライフのカウントアップ完了後に終了
        const finalTimer = setTimeout(() => {
          if (isComplete) return;
          isComplete = true;
          console.log(`[FINAL] ${Date.now() - startTime}ms: 最終スコア表示`);
        }, 500);
        timers.push(finalTimer);
      }
    };

    // 最初のライフ処理を開始
    processNextLife();

    return () => {
      console.log('[CLEANUP] タイマー全クリア');
      isComplete = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [initialLives, initialScore, difficulty]);

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
        {/* 結果ヘッダー */}
        <ResultHeader lives={lives} score={score} currentStage={9} totalStages={10} />

        <Typography variant="h3" align="center" gutterBottom sx={{ mt: 2 }}>
          ゲームクリア！
        </Typography>
      </Container>
    </Box>
  );
}
