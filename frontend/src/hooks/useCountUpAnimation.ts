import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../stores/gameStore';
import { LIFE_BONUS_POINTS } from '../stores/gameStore';

interface UseCountUpAnimationOptions {
  initialLives: number;
  initialScore: number;
  difficulty: Difficulty;
}

interface UseCountUpAnimationResult {
  lives: number;
  score: number;
  showContent: boolean;
  stop: () => void;
}

/** ライフ換金アニメーション（ライフ→スコアへのカウントアップ）を管理するフック */
export function useCountUpAnimation({
  initialLives,
  initialScore,
  difficulty,
}: UseCountUpAnimationOptions): UseCountUpAnimationResult {
  const [lives, setLives] = useState(initialLives);
  const [score, setScore] = useState(initialScore);
  const [showContent, setShowContent] = useState(false);

  const animationStateRef = useRef({
    isRunning: false,
    timers: [] as ReturnType<typeof setTimeout>[],
    intervals: [] as ReturnType<typeof setInterval>[],
  });

  const clearAnimationTimers = useCallback(() => {
    const s = animationStateRef.current;
    s.timers.forEach(clearTimeout);
    s.intervals.forEach(clearInterval);
    s.timers = [];
    s.intervals = [];
  }, []);

  const stop = useCallback(() => {
    animationStateRef.current.isRunning = false;
    clearAnimationTimers();
  }, [clearAnimationTimers]);

  useEffect(() => {
    // ゲームオーバー（ライフ0）の場合はアニメーションなし、即座にコンテンツ表示
    if (initialLives === 0) {
      setLives(0);
      setScore(initialScore);
      setShowContent(true);
      return;
    }

    const s = animationStateRef.current;
    clearAnimationTimers();
    s.isRunning = true;

    setLives(initialLives);
    setScore(initialScore);

    let currentLifeIndex = 0;

    const processNextLife = () => {
      if (!s.isRunning || currentLifeIndex >= initialLives) {
        return;
      }

      const bonusPoints = LIFE_BONUS_POINTS[difficulty];
      const countUpSteps = bonusPoints / 10;
      const countUpDuration = 500;
      const intervalPerStep = countUpDuration / countUpSteps;

      let currentCount = 0;
      const countUpInterval = setInterval(() => {
        if (!s.isRunning) return;

        currentCount++;
        setScore((prev) => prev + 10);

        if (currentCount >= countUpSteps) {
          clearInterval(countUpInterval);
          setLives((prev) => Math.max(0, prev - 1));
        }
      }, intervalPerStep);
      s.intervals.push(countUpInterval);

      currentLifeIndex++;

      if (currentLifeIndex < initialLives) {
        const nextLifeTimer = setTimeout(() => {
          if (s.isRunning) processNextLife();
        }, 600);
        s.timers.push(nextLifeTimer);
      } else {
        const finalTimer = setTimeout(() => {
          if (!s.isRunning) return;
          setShowContent(true);
        }, 500);
        s.timers.push(finalTimer);
      }
    };

    processNextLife();

    return () => {
      s.isRunning = false;
      clearAnimationTimers();
    };
  }, [initialLives, initialScore, difficulty, clearAnimationTimers]);

  return { lives, score, showContent, stop };
}
