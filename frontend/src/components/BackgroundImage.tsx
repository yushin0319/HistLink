import { Box } from '@mui/material';

interface BackgroundImageProps {
  opacity?: number;
}

export default function BackgroundImage({ opacity = 0.2 }: BackgroundImageProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100vw',
        height: '100vh',
        opacity,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="/histlink-bg.png"
        alt=""
        style={{
          minWidth: '100%',
          minHeight: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  );
}
