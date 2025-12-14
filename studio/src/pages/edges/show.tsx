import { Show } from '@refinedev/mui';
import { useShow } from '@refinedev/core';
import { Typography, Stack, Chip, Box } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export function EdgeShow() {
  const { queryResult } = useShow({
    resource: 'edges',
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
        <div>
          <Typography variant="caption" color="text.secondary">
            妥当性
          </Typography>
          <div>
            <Chip
              label={record?.is_reasonable ? '妥当' : '要確認'}
              color={record?.is_reasonable ? 'success' : 'warning'}
              size="small"
            />
          </div>
        </div>
      </Stack>
    </Show>
  );
}
