import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import LinkIcon from '@mui/icons-material/Link';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { Refine } from '@refinedev/core';
import {
  RefineSnackbarProvider,
  RefineThemes,
  ThemedLayoutV2,
  ThemedTitleV2,
  useNotificationProvider,
} from '@refinedev/mui';
import routerProvider from '@refinedev/react-router-v6';
import { useMemo } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { EdgeCreate, EdgeEdit, EdgeList, EdgeShow } from './pages/edges';
import { GameList, GameShow } from './pages/games';
import { TermCreate, TermEdit, TermList, TermShow } from './pages/terms';
import { createDataProvider } from './providers/dataProvider';

function RefineApp() {
  const { addTerm, updateTerm, deleteTerm, addEdge, updateEdge, deleteEdge } =
    useData();

  const dataProvider = useMemo(
    () =>
      createDataProvider({
        addTerm,
        updateTerm,
        deleteTerm,
        addEdge,
        updateEdge,
        deleteEdge,
      }),
    [addTerm, updateTerm, deleteTerm, addEdge, updateEdge, deleteEdge],
  );

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      notificationProvider={useNotificationProvider}
      resources={[
        {
          name: 'terms',
          list: '/terms',
          create: '/terms/create',
          edit: '/terms/edit/:id',
          show: '/terms/show/:id',
          meta: {
            icon: <MenuBookIcon />,
            label: '用語',
          },
        },
        {
          name: 'edges',
          list: '/edges',
          create: '/edges/create',
          edit: '/edges/edit/:id',
          show: '/edges/show/:id',
          meta: {
            icon: <LinkIcon />,
            label: '関連',
          },
        },
        {
          name: 'games',
          list: '/games',
          show: '/games/show/:id',
          meta: {
            icon: <SportsEsportsIcon />,
            label: 'ゲーム履歴',
          },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
      }}
    >
      <Routes>
        <Route
          element={
            <ThemedLayoutV2
              Title={({ collapsed }) => (
                <ThemedTitleV2
                  collapsed={collapsed}
                  text="HistLink Studio"
                  icon={<HistoryEduIcon />}
                />
              )}
            >
              <Outlet />
            </ThemedLayoutV2>
          }
        >
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
          <Route path="/" element={<TermList />} />
        </Route>
      </Routes>
    </Refine>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={RefineThemes.Green}>
        <CssBaseline />
        <GlobalStyles styles={{ html: { WebkitFontSmoothing: 'auto' } }} />
        <RefineSnackbarProvider>
          <DataProvider>
            <RefineApp />
          </DataProvider>
        </RefineSnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
