import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridSortModel,
} from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';

interface Game {
  id: string;
  player_name: string;
  difficulty: string;
  score: number;
  total_stages: number;
  is_completed: boolean;
  created_at: string;
}

export function GameList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['games', paginationModel, sortModel],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set(
        'skip',
        String(paginationModel.page * paginationModel.pageSize),
      );
      params.set('limit', String(paginationModel.pageSize));
      if (sortModel[0]) {
        params.set('sort_by', sortModel[0].field);
        params.set('sort_order', sortModel[0].sort ?? 'asc');
      }
      return api.list<Game>('games', params);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('games', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const handleDelete = (id: string) => {
    if (!window.confirm('このゲーム記録を削除しますか？')) return;
    deleteMutation.mutate(id);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 280 },
    { field: 'player_name', headerName: 'プレイヤー', width: 120 },
    {
      field: 'difficulty',
      headerName: '難易度',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={
            value === 'easy'
              ? 'かんたん'
              : value === 'hard'
                ? '難しい'
                : 'ふつう'
          }
          color={
            value === 'easy'
              ? 'success'
              : value === 'hard'
                ? 'error'
                : 'default'
          }
          size="small"
        />
      ),
    },
    { field: 'score', headerName: 'スコア', width: 100 },
    { field: 'total_stages', headerName: 'ステージ数', width: 100 },
    {
      field: 'is_completed',
      headerName: '状態',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value ? 'クリア' : 'ゲームオーバー'}
          color={value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: '日時',
      width: 180,
      valueFormatter: (value) =>
        value ? new Date(value).toLocaleString('ja-JP') : '',
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => navigate(`/games/show/${row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        ゲーム履歴
      </Typography>
      <DataGrid
        rows={data?.data ?? []}
        rowCount={data?.total ?? 0}
        loading={isLoading}
        paginationMode="server"
        sortingMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        autoHeight
      />
    </Box>
  );
}
