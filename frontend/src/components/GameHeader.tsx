import { Box, Typography, Grid } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

interface GameHeaderProps {
  lives: number;
  score: number;
  currentStage: number;
  totalStages: number;
  remainingTime: number;
}

export default function GameHeader({
  lives,
  score,
  currentStage,
  totalStages,
  remainingTime,
}: GameHeaderProps) {
  return (
    <Box
      sx={{
        mb: 4,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      <Grid container spacing={2}>
        {/* ライフ */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <FavoriteIcon color="error" />
            <Typography variant="h6" fontWeight="bold">
              ライフ: {lives}
            </Typography>
          </Box>
        </Grid>

        {/* スコア */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <EmojiEventsIcon color="warning" />
            <Typography variant="h6" fontWeight="bold">
              スコア: {score}
            </Typography>
          </Box>
        </Grid>

        {/* ステージ */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <ViewModuleIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              ステージ: {currentStage + 1} / {totalStages}
            </Typography>
          </Box>
        </Grid>

        {/* タイマー */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <TimerIcon color="info" />
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                color: remainingTime <= 30 ? 'error.main' : 'text.primary',
              }}
            >
              {(remainingTime / 10).toFixed(1)}秒
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
