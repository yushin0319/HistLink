import { Paper, Typography, Box } from '@mui/material';

interface GameCardProps {
  term: string;
  era: string;
}

export default function GameCard({ term, era }: GameCardProps) {
  return (
    <Paper
      elevation={8}
      sx={{
        width: { xs: '100%', sm: 400, md: 500 },
        height: { xs: 200, sm: 250, md: 300 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        bgcolor: 'background.paper',
        transition: 'all 0.3s ease',
        border: '2px solid',
        borderColor: 'primary.main',
        background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
        }
      }}
    >
      <Box sx={{ textAlign: 'center', px: 3 }}>
        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            mb: 1,
            color: 'text.primary'
          }}
        >
          {term}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' },
            color: 'text.secondary',
            fontWeight: 500
          }}
        >
          {era}
        </Typography>
      </Box>
    </Paper>
  );
}
