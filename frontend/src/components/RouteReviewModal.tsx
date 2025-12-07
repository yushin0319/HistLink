import { Box, Typography, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { RouteStepWithChoices } from '../types/api';

interface RouteReviewModalProps {
  open: boolean;
  onClose: () => void;
  steps: RouteStepWithChoices[];
  falseSteps: number[]; // 間違えたステージのインデックス配列
}

export default function RouteReviewModal({ open, onClose, steps, falseSteps }: RouteReviewModalProps) {
  // 最初に間違えたステージ以降をグレー表示するための判定
  const firstFalseStep = falseSteps.length > 0 ? Math.min(...falseSteps) : -1;
  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 2,
          maxWidth: '90vw',
          maxHeight: '80vh',
          width: 400,
          overflow: 'auto',
          position: 'relative',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {/* 閉じるボタン */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* ルート表示 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, mt: 3 }}>
          {steps.map((step, index) => {
            // このステージで間違えたか
            const isFalseStep = falseSteps.includes(index);
            // 最初のミス以降か（グレー表示対象）
            const isAfterFirstFalse = firstFalseStep >= 0 && index > firstFalseStep;

            return (
              <Box key={step.term.id} sx={{ width: '100%' }}>
                {/* 用語カード */}
                <Box
                  sx={{
                    py: 0.5,
                    px: 1.5,
                    border: isFalseStep ? '2px solid' : '1px solid',
                    borderColor: isFalseStep ? 'error.main' : 'grey.300',
                    borderRadius: 1,
                    textAlign: 'center',
                    opacity: isAfterFirstFalse ? 0.4 : 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ color: isAfterFirstFalse ? 'text.disabled' : 'text.primary' }}
                  >
                    {step.term.name}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 0.5, color: isAfterFirstFalse ? 'text.disabled' : 'text.secondary' }}
                    >
                      {step.term.category}
                    </Typography>
                  </Typography>
                </Box>

                {/* キーワード・説明（最後の要素以外） */}
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      py: 0.5,
                      opacity: isAfterFirstFalse ? 0.4 : 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: isFalseStep ? 'error.main' : isAfterFirstFalse ? 'text.disabled' : 'primary.main',
                        fontWeight: 'medium',
                        fontSize: '0.75rem',
                      }}
                    >
                      {step.keyword}
                    </Typography>
                    {step.relation_description && (
                      <Typography
                        variant="caption"
                        sx={{
                          width: '70%',
                          textAlign: 'center',
                          fontSize: '0.65rem',
                          color: isAfterFirstFalse ? 'text.disabled' : 'text.secondary',
                        }}
                      >
                        {step.relation_description}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Modal>
  );
}
