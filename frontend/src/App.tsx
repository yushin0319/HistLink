import { useState } from 'react';
import SelectPage from './pages/SelectPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

type Page = 'select' | 'game' | 'result';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('result');

  if (currentPage === 'select') {
    return <SelectPage />;
  }

  if (currentPage === 'game') {
    return <GamePage />;
  }

  if (currentPage === 'result') {
    return <ResultPage />;
  }

  return null;
}
