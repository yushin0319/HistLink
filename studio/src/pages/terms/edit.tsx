import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import { type Term, useData } from '../../contexts/DataContext';

const DIFFICULTIES = [
  { value: 'easy', label: 'かんたん' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: '難しい' },
];

interface TermFormData {
  name: string;
  category: string;
  description: string;
  difficulty: string;
}

export function TermEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateTerm } = useData();

  const { data: record } = useQuery({
    queryKey: ['terms', id],
    queryFn: () => api.get<Term>('terms', id as string),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermFormData>();

  useEffect(() => {
    if (record) reset(record);
  }, [record, reset]);

  const mutation = useMutation({
    mutationFn: (data: TermFormData) =>
      api.update<Term>('terms', id as string, data),
    onSuccess: (term) => {
      updateTerm(term);
      navigate('/terms');
    },
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        用語を編集
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
      >
        <TextField
          {...register('name', { required: '用語名は必須です' })}
          label="用語名"
          error={!!errors.name}
          helperText={errors.name?.message}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          {...register('category', { required: 'カテゴリは必須です' })}
          label="カテゴリ"
          error={!!errors.category}
          helperText={errors.category?.message}
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
        <TextField
          {...register('difficulty', { required: '難易度は必須です' })}
          label="難易度"
          select
          error={!!errors.difficulty}
          helperText={errors.difficulty?.message}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        >
          {DIFFICULTIES.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            保存
          </Button>
          <Button variant="outlined" onClick={() => navigate('/terms')}>
            キャンセル
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
