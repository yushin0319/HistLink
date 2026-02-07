import { Edit } from '@refinedev/mui';
import { Box, TextField, FormControlLabel, Switch, Autocomplete } from '@mui/material';
import { useForm } from '@refinedev/react-hook-form';
import { useList } from '@refinedev/core';
import { Controller } from 'react-hook-form';

interface Term {
  id: number;
  name: string;
}

export function EdgeEdit() {
  const {
    saveButtonProps,
    register,
    control,
    formState: { errors },
    refineCore: { queryResult },
  } = useForm({
    refineCoreProps: {
      resource: 'edges',
    },
  });

  const record = queryResult?.data?.data;

  const { data: termsData } = useList<Term>({
    resource: 'terms',
    pagination: { pageSize: 1000 },
  });
  const terms = termsData?.data ?? [];

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Controller
          name="from_term_id"
          control={control}
          rules={{ required: '元用語は必須です' }}
          render={({ field }) => (
            <Autocomplete
              options={terms}
              getOptionLabel={(option) => option.name}
              value={terms.find((t) => t.id === field.value) ?? null}
              onChange={(_, value) => field.onChange(value?.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="元用語"
                  error={!!errors.from_term_id}
                  helperText={errors.from_term_id?.message as string}
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
            <Autocomplete
              options={terms}
              getOptionLabel={(option) => option.name}
              value={terms.find((t) => t.id === field.value) ?? null}
              onChange={(_, value) => field.onChange(value?.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="先用語"
                  error={!!errors.to_term_id}
                  helperText={errors.to_term_id?.message as string}
                />
              )}
            />
          )}
        />
        <TextField
          {...register('keyword', { required: 'キーワードは必須です' })}
          label="キーワード"
          error={!!errors.keyword}
          helperText={errors.keyword?.message as string}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          {...register('description', { required: '説明は必須です' })}
          label="説明"
          multiline
          rows={4}
          error={!!errors.description}
          helperText={errors.description?.message as string}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Controller
          name="is_reasonable"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value ?? record?.is_reasonable ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="妥当性確認済み"
            />
          )}
        />
      </Box>
    </Edit>
  );
}
