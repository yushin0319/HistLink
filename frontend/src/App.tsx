import { useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { Favorite, Link as LinkIcon, TrendingUp } from '@mui/icons-material';
import GameCard from './components/GameCard';
import ChoiceCard from './components/ChoiceCard';

interface CardData {
  id: string;
  term: string;
  era: string;
}

const sampleCurrentCard: CardData = {
  id: '1',
  term: '縄文時代',
  era: '古代'
};

const sampleChoices: CardData[] = [
  { id: '2', term: '弥生時代', era: '古代' },
  { id: '3', term: '古墳時代', era: '古代' },
  { id: '4', term: '飛鳥時代', era: '古代' },
  { id: '5', term: '奈良時代', era: '古代' }
];

export default function App() {
  const [lives, setLives] = useState(3);
  const [chain, setChain] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const handleChoiceClick = (id: string) => {
    setSelectedChoice(id);
    // Simulate correct answer - you can add your game logic here
    setTimeout(() => {
      setChain(chain + 1);
      setScore(score + 100);
      setSelectedChoice(null);
    }, 500);
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
            mb: 4
          }}
        >
          <GameCard term={sampleCurrentCard.term} era={sampleCurrentCard.era} />
        </Box>

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
              era={choice.era}
              onClick={() => handleChoiceClick(choice.id)}
              isSelected={selectedChoice === choice.id}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
