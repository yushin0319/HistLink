import { useState, useEffect } from 'react';
import SelectPage from './pages/SelectPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import RulePage from './pages/RulePage';
import { useGameStore } from './stores/gameStore';

const TUTORIAL_SEEN_KEY = 'histlink_tutorial_seen';

export default function App() {
  const { isPlaying, isCompleted, lives, gameId, pendingStart, confirmStart } = useGameStore();
  const [showRule, setShowRule] = useState(false);

  // チュートリアル表示判定
  useEffect(() => {
    if (pendingStart) {
      const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
      if (!seen) {
        setShowRule(true);
      } else {
        // 既に見た場合は直接ゲーム開始
        confirmStart();
      }
    }
  }, [pendingStart, confirmStart]);

  const handleRuleComplete = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    setShowRule(false);
    confirmStart();
  };

  // ルール画面表示中
  if (showRule) {
    return <RulePage onStart={handleRuleComplete} />;
  }

  // ゲーム終了（クリアまたはゲームオーバー）→ ResultPage
  if (!isPlaying && gameId && (isCompleted || lives === 0)) {
    return <ResultPage />;
  }

  // ゲーム中 → GamePage
  if (isPlaying || gameId) {
    return <GamePage />;
  }

  // 初期状態 → SelectPage
  return <SelectPage />;
}
