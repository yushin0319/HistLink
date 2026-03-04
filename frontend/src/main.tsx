import { CssBaseline, createTheme, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4CAF50', // 落ち着いたグリーン
    },
    error: {
      main: '#F44336', // マテリアルレッド
    },
    background: {
      default: '#E8E8E8', // 薄いグレー
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
