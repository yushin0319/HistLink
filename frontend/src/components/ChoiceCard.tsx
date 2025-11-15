import { Paper, Typography, Box } from '@mui/material';

interface ChoiceCardProps {
  term: string;
  era: string;
  onClick: () => void;
  isSelected?: boolean;
}

export default function ChoiceCard({ term, era, onClick, isSelected }: ChoiceCardProps) {
  return (
    <Paper
      elevation={4}
      onClick={onClick}
      sx={{
        height: { xs: 140, sm: 160, md: 180 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        borderRadius: 2,
        bgcolor: isSelected ? 'primary.main' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '2px solid transparent',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          borderColor: 'primary.main',
          bgcolor: isSelected ? 'primary.dark' : 'action.hover'
        },
        '&:active': {
          transform: 'translateY(-4px)'
        }
      }}
    >
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            mb: 0.5,
            color: isSelected ? 'primary.contrastText' : 'text.primary'
          }}
        >
          {term}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' },
            color: isSelected ? 'primary.contrastText' : 'text.secondary',
            fontWeight: 500
          }}
        >
          {era}
        </Typography>
      </Box>
    </Paper>
  );
}
