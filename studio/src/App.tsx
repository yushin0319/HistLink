import {
  CssBaseline,
  createTheme,
  GlobalStyles,
  ThemeProvider,
} from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { DataProvider } from './contexts/DataContext';
import { EdgeCreate, EdgeEdit, EdgeList, EdgeShow } from './pages/edges';
import { GameList, GameShow } from './pages/games';
import { TermCreate, TermEdit, TermList, TermShow } from './pages/terms';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: { primary: { main: '#2e7d32' } },
});

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={{ html: { WebkitFontSmoothing: 'auto' } }} />
        <QueryClientProvider client={queryClient}>
          <DataProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/terms">
                  <Route index element={<TermList />} />
                  <Route path="create" element={<TermCreate />} />
                  <Route path="edit/:id" element={<TermEdit />} />
                  <Route path="show/:id" element={<TermShow />} />
                </Route>
                <Route path="/edges">
                  <Route index element={<EdgeList />} />
                  <Route path="create" element={<EdgeCreate />} />
                  <Route path="edit/:id" element={<EdgeEdit />} />
                  <Route path="show/:id" element={<EdgeShow />} />
                </Route>
                <Route path="/games">
                  <Route index element={<GameList />} />
                  <Route path="show/:id" element={<GameShow />} />
                </Route>
                <Route path="/" element={<Navigate to="/terms" replace />} />
              </Route>
            </Routes>
          </DataProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
