import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
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

export function TermCreate() {
  const navigate = useNavigate();
  const { addTerm } = useData();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TermFormData>({ defaultValues: { difficulty: 'normal' } });

  const mutation = useMutation({
    mutationFn: (data: TermFormData) => api.create<Term>('terms', data),
    onSuccess: (term) => {
      addTerm(term);
      navigate('/terms');
    },
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        用語を作成
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
        />
        <TextField
          {...register('category', { required: 'カテゴリは必須です' })}
          label="カテゴリ"
          error={!!errors.category}
          helperText={errors.category?.message}
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
        <TextField
          {...register('difficulty', { required: '難易度は必須です' })}
          label="難易度"
          select
          defaultValue="normal"
          error={!!errors.difficulty}
          helperText={errors.difficulty?.message}
          fullWidth
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
