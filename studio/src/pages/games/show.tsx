import { Show } from '@refinedev/mui';
import { useShow } from '@refinedev/core';
import { Typography, Stack, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: '難しい',
};

export function GameShow() {
  const { queryResult } = useShow({
    resource: 'games',
  });
  const { data, isLoading } = queryResult;
  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
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
                label={DIFFICULTY_LABELS[record?.difficulty] ?? record?.difficulty}
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
    </Show>
  );
}
