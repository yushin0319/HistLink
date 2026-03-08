import {
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
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
}

export function EdgeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { terms, updateEdge } = useData();

  const { data: record } = useQuery({
    queryKey: ['edges', id],
    queryFn: () => api.get<Edge>('edges', id as string),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EdgeFormData>();

  useEffect(() => {
    if (record) {
      reset({
        from_term_id: record.from_term_id,
        to_term_id: record.to_term_id,
        keyword: record.keyword,
        description: record.description,
      });
    }
  }, [record, reset]);

  const mutation = useMutation({
    mutationFn: (data: EdgeFormData) =>
      api.update<Edge>('edges', id as string, data),
    onSuccess: (edge) => {
      updateEdge(edge);
      navigate('/edges');
    },
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        関連を編集
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
              value={terms.find((t) => t.id === field.value) ?? null}
              onChange={(_, value) => field.onChange(value?.id ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="元用語"
                  error={!!errors.from_term_id}
                  helperText={errors.from_term_id?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
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
              value={terms.find((t) => t.id === field.value) ?? null}
              onChange={(_, value) => field.onChange(value?.id ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="先用語"
                  error={!!errors.to_term_id}
                  helperText={errors.to_term_id?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
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
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          {...register('description', { required: '説明は必須です' })}
          label="説明"
          multiline
          rows={4}
          error={!!errors.description}
          helperText={errors.description?.message}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
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
