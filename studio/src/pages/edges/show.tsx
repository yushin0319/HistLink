import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import type { Edge } from '../../contexts/DataContext';

export function EdgeShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading } = useQuery({
    queryKey: ['edges', id],
    queryFn: () => api.get<Edge>('edges', id as string),
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
        <Typography variant="h5">関連詳細</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/edges/edit/${id}`)}
          >
            編集
          </Button>
          <Button variant="outlined" onClick={() => navigate('/edges')}>
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
            関連
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip label={record?.from_term_name} />
            <ArrowForwardIcon color="action" />
            <Chip label={record?.to_term_name} />
          </Box>
        </div>
        <div>
          <Typography variant="caption" color="text.secondary">
            キーワード
          </Typography>
          <Typography variant="h6">{record?.keyword}</Typography>
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
