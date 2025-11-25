import { Box, Typography, Grid } from '@mui/material';
import DiamondIcon from '@mui/icons-material/Diamond';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';

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
        mb: 2,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      <Grid container spacing={1}>
        {/* ライフ */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              flexDirection: 'column',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              LIFE
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, height: '2.125rem' }}>
              {Array.from({ length: 3 }).map((_, index) => (
                index < lives ? (
                  <DiamondIcon key={index} color="error" fontSize="medium" />
                ) : (
                  <DiamondOutlinedIcon key={index} color="disabled" fontSize="medium" />
                )
              ))}
            </Box>
          </Box>
        </Grid>

        {/* ステージ */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              flexDirection: 'column',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              STAGE
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '2.125rem' }}>
              <Typography variant="h4" fontWeight="bold">
                {currentStage + 1} / {totalStages}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* スコア */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              flexDirection: 'column',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              SCORE
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '2.125rem' }}>
              <Typography variant="h4" fontWeight="bold">
                {score}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* タイマー */}
        <Grid size={{ xs: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              flexDirection: 'column',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              TIMER
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '2.125rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    color: remainingTime <= 30 ? 'error.main' : 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '2ch',
                    textAlign: 'right',
                  }}
                >
                  {Math.floor(remainingTime / 10)}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    color: remainingTime <= 30 ? 'error.main' : 'text.primary',
                    width: '0.5ch',
                    textAlign: 'center',
                  }}
                >
                  .
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    color: remainingTime <= 30 ? 'error.main' : 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    width: '1ch',
                    textAlign: 'left',
                  }}
                >
                  {remainingTime % 10}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
