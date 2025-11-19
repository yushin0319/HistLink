import { useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { Favorite, Link as LinkIcon, TrendingUp } from '@mui/icons-material';
import GameCard from './components/GameCard';
import ChoiceCard from './components/ChoiceCard';
import RelationDisplay from './components/RelationDisplay';
import SelectPage from './pages/SelectPage';

interface CardData {
  id: string;
  term: string;
  era: string;
  description?: string;
}

interface RelationData {
  keyword: string;
  explanation: string;
}

const sampleCurrentCard: CardData = {
  id: '3',
  term: 'サンフランシスコ平和条約',
  era: '現代',
  description: '1951年に調印された第二次世界大戦の講和条約。日本の主権回復と占領終結を実現し、戦後の国際社会への復帰を果たした。'
};

const sampleChoices: CardData[] = [
  { id: '2', term: 'レオナルド・ダ・ヴィンチ', era: '近世' },
  { id: '3', term: 'サンフランシスコ平和条約', era: '現代' },
  { id: '4', term: 'ノルマンディー上陸作戦', era: '現代' },
  { id: '5', term: 'コンスタンティヌス帝', era: '古代' }
];

// サンプルリレーションデータ（正解は id: '2'）
const sampleRelation: RelationData = {
  keyword: '芸術家の活躍',
  explanation: 'ルネサンス期にレオナルド・ダ・ヴィンチが芸術と科学の両分野で活躍'
};

export default function App() {
  // 一時的にSelectPageだけ表示
  return <SelectPage />;

  /* 以下は後で使用
  const [lives, setLives] = useState(3);
  const [chain, setChain] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showRelation, setShowRelation] = useState(false);

  const handleChoiceClick = (id: string) => {
    setSelectedChoice(id);
    // Simulate correct answer (id: '2' is correct)
    const isCorrect = id === '2';

    if (isCorrect) {
      // Show relation display
      setShowRelation(true);

      // Hide relation and update game state after 2.5 seconds
      setTimeout(() => {
        setShowRelation(false);
        setChain(chain + 1);
        setScore(score + 100);
        setSelectedChoice(null);
      }, 2500);
    } else {
      // Wrong answer - just reset
      setTimeout(() => {
        setLives(lives - 1);
        setSelectedChoice(null);
      }, 500);
    }
  };
  */
}
