import {
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { type Edge, useData } from '../../contexts/DataContext';

interface Term {
  id: number;
  name: string;
}

interface EdgeFormData {
  from_term_id: number | null;
  to_term_id: number | null;
  keyword: string;
  description: string;
  is_reasonable: boolean;
}

export function EdgeCreate() {
  const navigate = useNavigate();
  const { terms, addEdge } = useData();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EdgeFormData>({ defaultValues: { is_reasonable: true } });

  const mutation = useMutation({
    mutationFn: (data: EdgeFormData) => api.create<Edge>('edges', data),
    onSuccess: (edge) => {
      addEdge(edge);
      navigate('/edges');
    },
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        関連を作成
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
      >
        <Controller
          name="from_term_id"
          control={control}
          rules={{ required: '元用語は必須です' }}
          render={({ field }) => (
            <Autocomplete<Term>
              options={terms}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => field.onChange(value?.id ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="元用語"
                  error={!!errors.from_term_id}
                  helperText={errors.from_term_id?.message}
                />
              )}
            />
          )}
        />
        <Controller
          name="to_term_id"
          control={control}
          rules={{ required: '先用語は必須です' }}
          render={({ field }) => (
            <Autocomplete<Term>
              options={terms}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => field.onChange(value?.id ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="先用語"
                  error={!!errors.to_term_id}
                  helperText={errors.to_term_id?.message}
                />
              )}
            />
          )}
        />
        <TextField
          {...register('keyword', { required: 'キーワードは必須です' })}
          label="キーワード"
          error={!!errors.keyword}
          helperText={errors.keyword?.message}
          fullWidth
        />
        <TextField
          {...register('description', { required: '説明は必須です' })}
          label="説明"
          multiline
          rows={4}
          error={!!errors.description}
          helperText={errors.description?.message}
          fullWidth
        />
        <Controller
          name="is_reasonable"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="妥当性確認済み"
            />
          )}
        />
        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            保存
          </Button>
          <Button variant="outlined" onClick={() => navigate('/edges')}>
            キャンセル
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
