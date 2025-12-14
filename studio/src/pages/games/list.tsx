import { useDataGrid, List, ShowButton, DeleteButton } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Stack, Chip } from '@mui/material';

export function GameList() {
  const { dataGridProps } = useDataGrid({
    resource: 'games',
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 280 },
    { field: 'player_name', headerName: 'プレイヤー', width: 120 },
    {
      field: 'difficulty',
      headerName: '難易度',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'easy' ? 'かんたん' : value === 'hard' ? '難しい' : 'ふつう'}
          color={value === 'easy' ? 'success' : value === 'hard' ? 'error' : 'default'}
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
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <ShowButton hideText recordItemId={row.id} />
          <DeleteButton hideText recordItemId={row.id} />
        </Stack>
      ),
    },
  ];

  return (
    <List>
      <DataGrid
        {...dataGridProps}
        columns={columns}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
      />
    </List>
  );
}
