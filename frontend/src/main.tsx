import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App.tsx';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#90EE90', // ライトグリーン
    },
    error: {
      main: '#FF6B6B', // ライトレッド
    },
    background: {
      default: '#E8E8E8', // 薄いグレー
      paper: '#FFFFFF',
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
