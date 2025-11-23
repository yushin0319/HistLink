import { useState } from 'react';
import SelectPage from './pages/SelectPage';
import GamePage from './pages/GamePage';

type Page = 'select' | 'game';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('game');

  // SelectPageからGamePageへの遷移
  const handleStartGame = () => {
    setCurrentPage('game');
  };

  if (currentPage === 'select') {
    return <SelectPage />;
  }

  if (currentPage === 'game') {
    return <GamePage />;
  }

  return null;
}
