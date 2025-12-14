import { Create } from '@refinedev/mui';
import { Box, TextField, MenuItem } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';

const DIFFICULTIES = [
  { value: 'easy', label: 'かんたん' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: '難しい' },
];

export function TermCreate() {
  const {
    saveButtonProps,
    register,
    formState: { errors },
  } = useForm({
    refineCoreProps: {
      resource: 'terms',
    },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          {...register('name', { required: '用語名は必須です' })}
          label="用語名"
          error={!!errors.name}
          helperText={errors.name?.message as string}
          fullWidth
        />
        <TextField
          {...register('category', { required: 'カテゴリは必須です' })}
          label="カテゴリ"
          error={!!errors.category}
          helperText={errors.category?.message as string}
          fullWidth
        />
        <TextField
          {...register('description', { required: '説明は必須です' })}
          label="説明"
          multiline
          rows={4}
          error={!!errors.description}
          helperText={errors.description?.message as string}
          fullWidth
        />
        <TextField
          {...register('difficulty', { required: '難易度は必須です' })}
          label="難易度"
          select
          defaultValue="normal"
          error={!!errors.difficulty}
          helperText={errors.difficulty?.message as string}
          fullWidth
        >
          {DIFFICULTIES.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Create>
  );
}
