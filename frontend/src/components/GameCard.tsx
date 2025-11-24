import { Paper, Typography, Box } from '@mui/material';

interface GameCardProps {
  term: string;
  era: string;
  description?: string;
}

export default function GameCard({ term, era, description }: GameCardProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        width: { xs: '100%', sm: 380, md: 450 },
        height: { xs: 160, sm: 180, md: 200 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderRadius: 3,
        bgcolor: 'background.paper',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
        }
      }}
    >
      {/* Top: Name & Era */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
            mb: 0.5,
            color: 'text.primary'
          }}
        >
          {term}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: '0.9rem', sm: '1rem' },
            color: 'text.secondary',
            fontWeight: 500,
            mb: description ? 0.5 : 0
          }}
        >
          {era}
        </Typography>
      </Box>

      {/* Bottom: Description */}
      {description && (
        <Box sx={{ width: '100%' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              lineHeight: 1.4,
              textAlign: 'center'
            }}
          >
            {description}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
