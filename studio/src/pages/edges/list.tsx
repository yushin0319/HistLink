import { useDataGrid, List, EditButton, ShowButton, DeleteButton } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Stack, Chip } from '@mui/material';

export function EdgeList() {
  const { dataGridProps } = useDataGrid({
    resource: 'edges',
  });

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
          color={value === 'easy' ? 'success' : value === 'hard' ? 'error' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 180,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <ShowButton hideText recordItemId={row.id} />
          <EditButton hideText recordItemId={row.id} />
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
