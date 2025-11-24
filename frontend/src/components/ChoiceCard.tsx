import { Paper, Typography, Box } from '@mui/material';

interface ChoiceCardProps {
  term: string;
  onClick: () => void;
  isSelected?: boolean;
  feedbackState?: 'correct' | 'incorrect' | null;
}

export default function ChoiceCard({ term, onClick, isSelected, feedbackState }: ChoiceCardProps) {
  // フィードバック状態に応じた背景色を決定
  const getBgColor = () => {
    if (feedbackState === 'correct') return 'success.light';
    if (feedbackState === 'incorrect') return 'error.light';
    if (isSelected) return 'primary.main';
    return 'background.paper';
  };

  // フィードバック状態に応じたボーダー色を決定
  const getBorderColor = () => {
    if (feedbackState === 'correct') return 'success.light';
    if (feedbackState === 'incorrect') return 'error.light';
    return 'transparent';
  };

  // フィードバック状態に応じたテキスト色を決定
  const getTextColor = () => {
    if (feedbackState === 'correct' || feedbackState === 'incorrect') {
      return 'white';
    }
    if (isSelected) return 'primary.contrastText';
    return 'text.primary';
  };
  return (
    <Paper
      elevation={4}
      onClick={onClick}
      sx={{
        height: { xs: 100, sm: 120, md: 140 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2,
        bgcolor: getBgColor(),
        cursor: feedbackState ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        border: '2px solid',
        borderColor: getBorderColor(),
        '&:hover': feedbackState
          ? {}
          : {
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              borderColor: 'primary.main',
              bgcolor: isSelected ? 'primary.dark' : 'action.hover',
            },
        '&:active': feedbackState ? {} : { opacity: 0.8 },
      }}
    >
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1rem', sm: '1.2rem' },
            color: getTextColor(),
          }}
        >
          {term}
        </Typography>
      </Box>
    </Paper>
  );
}
