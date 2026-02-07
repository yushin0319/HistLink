import { Show } from '@refinedev/mui';
import { useShow } from '@refinedev/core';
import { Typography, Stack, Chip } from '@mui/material';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: '難しい',
};

export function TermShow() {
  const { queryResult } = useShow({
    resource: 'terms',
  });
  const { data, isLoading } = queryResult;
  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
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
      </Stack>
    </Show>
  );
}
