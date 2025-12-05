import SelectPage from './pages/SelectPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const { isPlaying, isCompleted, lives, gameId } = useGameStore();

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
