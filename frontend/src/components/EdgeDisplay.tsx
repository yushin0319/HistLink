import { Box, Typography, Fade } from '@mui/material';

interface EdgeDisplayProps {
  keyword: string;
  explanation: string;
  show: boolean;
}

export default function EdgeDisplay({ keyword, explanation, show }: EdgeDisplayProps) {
  return (
    <Box
      sx={{
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 1,
        mt: 2
      }}
    >
      <Fade in={show} timeout={300}>
        <Box
          sx={{
            textAlign: 'center'
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight="bold"
            sx={{ fontSize: '0.9rem', mb: 0.5 }}
          >
            {keyword}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.8rem', width: '70%', mx: 'auto' }}
          >
            {explanation}
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
}
