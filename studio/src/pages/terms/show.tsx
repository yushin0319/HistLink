import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import type { Term } from '../../contexts/DataContext';

export function TermShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading } = useQuery({
    queryKey: ['terms', id],
    queryFn: () => api.get<Term>('terms', id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5">用語詳細</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/terms/edit/${id}`)}
          >
            編集
          </Button>
          <Button variant="outlined" onClick={() => navigate('/terms')}>
            一覧へ
          </Button>
        </Stack>
      </Box>
      <Stack spacing={2}>
        <div>
          <Typography variant="caption" color="text.secondary">
            ID
          </Typography>
          <Typography variant="body1">{record?.id}</Typography>
        </div>
        <div>
          <Typography variant="caption" color="text.secondary">
            用語名
          </Typography>
          <Typography variant="h6">{record?.name}</Typography>
        </div>
        <div>
          <Typography variant="caption" color="text.secondary">
            カテゴリ
          </Typography>
          <Typography variant="body1">{record?.category}</Typography>
        </div>
        <div>
          <Typography variant="caption" color="text.secondary">
            説明
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {record?.description}
          </Typography>
        </div>
      </Stack>
    </Box>
  );
}
