import { useState } from 'react';
import { Box, Button, Container, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import BackgroundImage from '../components/BackgroundImage';

type Difficulty = 'easy' | 'normal' | 'hard';
type TotalStages = 10 | 30 | 50;

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: '難しい',
};

const stageLabels: Record<TotalStages, string> = {
  10: '10問',
  30: '30問',
  50: '50問',
};

export default function SelectPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [selectedStages, setSelectedStages] = useState<TotalStages>(10);
  const { requestStartGame } = useGameStore();

  const handleStart = () => {
    requestStartGame(selectedDifficulty, selectedStages);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BackgroundImage />

      <Container
        maxWidth="sm"
        sx={{
          py: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        {/* タイトル */}
        <Typography
          variant="h2"
          fontWeight="bold"
          sx={{
            mb: 2,
            fontSize: { xs: '2.5rem', sm: '3rem' },
            color: 'text.primary',
          }}
        >
          HistLink
        </Typography>

        {/* サブタイトル */}
        <Typography
          variant="body1"
          sx={{
            mb: 6,
            fontSize: '1rem',
            color: 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          関連する出来事をつなげて
          <br />
          ハイスコアをめざそう！
        </Typography>

        {/* 難易度選択 */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={selectedDifficulty}
            exclusive
            fullWidth
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setSelectedDifficulty(newValue);
              }
            }}
            sx={{
              width: '100%',
              maxWidth: 400,
              '& .MuiToggleButton-root': {
                flex: 1,
                px: { xs: 2, sm: 4 },
                py: 1.5,
                fontWeight: 600,
                fontSize: '1rem',
                border: '2px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.main',
                  },
                },
              },
            }}
          >
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((difficulty) => (
              <ToggleButton
                key={difficulty}
                value={difficulty}
                data-selected={selectedDifficulty === difficulty}
              >
                {difficultyLabels[difficulty]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* ステージ数選択 */}
        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={selectedStages}
            exclusive
            fullWidth
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setSelectedStages(newValue);
              }
            }}
            sx={{
              width: '100%',
              maxWidth: 400,
              '& .MuiToggleButton-root': {
                flex: 1,
                px: { xs: 2, sm: 4 },
                py: 1.5,
                fontWeight: 600,
                fontSize: '1rem',
                border: '2px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.main',
                  },
                },
              },
            }}
          >
            {([10, 30, 50] as TotalStages[]).map((stages) => (
              <ToggleButton
                key={stages}
                value={stages}
                data-selected={selectedStages === stages}
              >
                {stageLabels[stages]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* スタートボタン */}
        <Button
          variant="contained"
          size="large"
          onClick={handleStart}
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
          スタート
        </Button>
      </Box>
      </Container>
    </Box>
  );
}
