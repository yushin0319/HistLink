import { useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { Favorite, Link as LinkIcon, TrendingUp } from '@mui/icons-material';
import GameCard from './components/GameCard';
import ChoiceCard from './components/ChoiceCard';
import RelationDisplay from './components/RelationDisplay';

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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        py: 3
      }}
    >
      <Container maxWidth="lg">
        {/* Game Info Bar */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 2,
            bgcolor: 'background.paper',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          {/* Lives */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {[...Array(3)].map((_, index) => (
              <Favorite
                key={index}
                sx={{
                  color: index < lives ? '#e91e63' : 'action.disabled',
                  fontSize: 32,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Box>

          {/* Chain Count */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              {chain}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              連鎖
            </Typography>
          </Box>

          {/* Score */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: 'success.main', fontSize: 28 }} />
            <Typography variant="h5" fontWeight="bold">
              {score.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              点
            </Typography>
          </Box>
        </Paper>

        {/* Current Card */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <GameCard
            term={sampleCurrentCard.term}
            era={sampleCurrentCard.era}
            description={sampleCurrentCard.description}
          />
        </Box>

        {/* Relation Display (always reserves space, shown after correct answer) */}
        <RelationDisplay
          keyword={sampleRelation.keyword}
          explanation={sampleRelation.explanation}
          show={showRelation}
        />

        {/* Choice Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2
          }}
        >
          {sampleChoices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              term={choice.term}
              onClick={() => handleChoiceClick(choice.id)}
              isSelected={selectedChoice === choice.id}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
