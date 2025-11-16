import { Paper, Typography, Box } from '@mui/material';

interface ChoiceCardProps {
  term: string;
  onClick: () => void;
  isSelected?: boolean;
}

export default function ChoiceCard({ term, onClick, isSelected }: ChoiceCardProps) {
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
        bgcolor: isSelected ? 'primary.main' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '2px solid transparent',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          borderColor: 'primary.main',
          bgcolor: isSelected ? 'primary.dark' : 'action.hover'
        },
        '&:active': {
          opacity: 0.8
        }
      }}
    >
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1rem', sm: '1.2rem' },
            color: isSelected ? 'primary.contrastText' : 'text.primary'
          }}
        >
          {term}
        </Typography>
      </Box>
    </Paper>
  );
}
