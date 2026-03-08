import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';

interface Game {
  id: string;
  player_name: string;
  difficulty: string;
  score: number;
  is_completed: boolean;
  created_at: string;
  route: number[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: '難しい',
};

export function GameShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading } = useQuery({
    queryKey: ['games', id],
    queryFn: () => api.get<Game>('games', id as string),
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
        <Typography variant="h5">ゲーム詳細</Typography>
        <Button variant="outlined" onClick={() => navigate('/games')}>
          一覧へ
        </Button>
      </Box>
      <Stack spacing={3}>
        <Stack direction="row" spacing={4}>
          <div>
            <Typography variant="caption" color="text.secondary">
              ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {record?.id}
            </Typography>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              プレイヤー
            </Typography>
            <Typography variant="h6">{record?.player_name}</Typography>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              難易度
            </Typography>
            <div>
              <Chip
                label={
                  DIFFICULTY_LABELS[record?.difficulty ?? ''] ??
                  record?.difficulty
                }
                color={
                  record?.difficulty === 'easy'
                    ? 'success'
                    : record?.difficulty === 'hard'
                      ? 'error'
                      : 'default'
                }
                size="small"
              />
            </div>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              スコア
            </Typography>
            <Typography variant="h6">{record?.score}</Typography>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              状態
            </Typography>
            <div>
              <Chip
                label={record?.is_completed ? 'クリア' : 'ゲームオーバー'}
                color={record?.is_completed ? 'success' : 'error'}
                size="small"
              />
            </div>
          </div>
        </Stack>

        <div>
          <Typography variant="caption" color="text.secondary">
            プレイ日時
          </Typography>
          <Typography variant="body1">
            {record?.created_at
              ? new Date(record.created_at).toLocaleString('ja-JP')
              : '-'}
          </Typography>
        </div>

        {record?.route && record.route.length > 0 && (
          <div>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              ルート
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>用語</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {record.route.map((termId: number, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{termId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </div>
        )}
      </Stack>
    </Box>
  );
}
