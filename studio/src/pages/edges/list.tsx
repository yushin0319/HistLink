import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridSortModel,
} from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { type Edge, useData } from '../../contexts/DataContext';

export function EdgeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deleteEdge } = useData();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['edges', paginationModel, sortModel],
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
      return api.list<Edge>('edges', params);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete('edges', id),
    onSuccess: (_, id) => {
      deleteEdge(id);
      queryClient.invalidateQueries({ queryKey: ['edges'] });
    },
  });

  const handleDelete = (id: number) => {
    if (!window.confirm('この関連を削除しますか？')) return;
    deleteMutation.mutate(id);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'from_term_name', headerName: '元用語', flex: 1, minWidth: 120 },
    { field: 'to_term_name', headerName: '先用語', flex: 1, minWidth: 120 },
    { field: 'keyword', headerName: 'キーワード', width: 120 },
    { field: 'description', headerName: '説明', flex: 2, minWidth: 200 },
    {
      field: 'difficulty',
      headerName: '難易度',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'easy' ? '易' : value === 'hard' ? '難' : '普'}
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
    {
      field: 'actions',
      headerName: '操作',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => navigate(`/edges/show/${row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/edges/edit/${row.id}`)}
          >
            <EditIcon fontSize="small" />
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5">関連一覧</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/edges/create')}
        >
          新規作成
        </Button>
      </Box>
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
