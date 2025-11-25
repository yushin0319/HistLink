import { Box, Typography, Grid } from '@mui/material';
import DiamondIcon from '@mui/icons-material/Diamond';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';

interface ResultHeaderProps {
  lives: number;
  score: number;
  currentStage: number;
  totalStages: number;
}

export default function ResultHeader({ lives, score, currentStage, totalStages }: ResultHeaderProps) {
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
              {Array.from({ length: 3 }).map((_, index) => {
                // 右から消費（index 0, 1 が表示されている状態 = lives 2）
                const isFilled = index < lives;
                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      width: '24px',
                      height: '24px',
                    }}
                  >
                    {/* 赤ダイヤ（塗りつぶし） */}
                    <DiamondIcon
                      color="error"
                      fontSize="medium"
                      sx={{
                        position: 'absolute',
                        opacity: isFilled ? 1 : 0,
                      }}
                    />
                    {/* 空ダイヤ（アウトライン） */}
                    <DiamondOutlinedIcon
                      color="disabled"
                      fontSize="medium"
                      sx={{
                        position: 'absolute',
                        opacity: isFilled ? 0 : 1,
                      }}
                    />
                  </Box>
                );
              })}
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
              <Typography variant="h5" fontWeight="bold">
                {currentStage + 1 === totalStages ? 'COMPLETE' : `${currentStage + 1} / ${totalStages}`}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* スコア */}
        <Grid size={{ xs: 12 }}>
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
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '5ch',
                  textAlign: 'center',
                }}
              >
                {score}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
