import { Box, Button, Container, Typography, Paper } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BackgroundImage from '../components/BackgroundImage';

interface RulePageProps {
  onStart: () => void;
}

export default function RulePage({ onStart }: RulePageProps) {
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
          py: 3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          {/* タイトル */}
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              mb: 3,
              color: 'text.primary',
            }}
          >
            あそびかた
          </Typography>

          {/* ゲーム画面風のミニチュア */}
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
            }}
          >
            {/* 問題カード（縮小版） - GameCardと同様のレイアウト */}
            <Paper
              elevation={2}
              sx={{
                p: 1.5,
                mb: 1.5,
                borderRadius: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 100,
              }}
            >
              {/* 上部: 名前 & カテゴリ */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ color: 'text.primary', mb: 0.25 }}
                >
                  十字軍運動
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}
                >
                  中世ヨーロッパ
                </Typography>
              </Box>
              {/* 下部: 説明 */}
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  lineHeight: 1.4,
                  textAlign: 'center',
                }}
              >
                11-13世紀の聖地回復を目指したキリスト教徒の遠征。中世最大の宗教戦争
              </Typography>
            </Paper>

            {/* 矢印と説明 */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
              <ArrowDownwardIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography
                variant="body2"
                sx={{ ml: 1, color: 'text.secondary', fontWeight: 500 }}
              >
                もっとも関係が深い用語をタップ！
              </Typography>
            </Box>

            {/* 選択肢（2×2グリッド縮小版） */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.5 }}>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'success.light',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'white' }}>
                  エルサレム
                </Typography>
                <Typography variant="caption" sx={{ color: 'white', display: 'block', fontSize: '0.6rem' }}>
                  正解！即答で点数UP！
                </Typography>
              </Paper>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'grey.100',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  EEC
                </Typography>
              </Paper>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'error.light',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'white' }}>
                  冷戦
                </Typography>
                <Typography variant="caption" sx={{ color: 'white', display: 'block', fontSize: '0.6rem' }}>
                  不正解！ライフ-1
                </Typography>
              </Paper>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'grey.100',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  戦国時代
                </Typography>
              </Paper>
            </Box>

            {/* ライフ0でゲームオーバー */}
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              ライフ0でゲームオーバー
            </Typography>
          </Paper>

          {/* ゲーム開始ボタン */}
          <Button
            variant="contained"
            size="large"
            onClick={onStart}
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
            ゲームへ
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
