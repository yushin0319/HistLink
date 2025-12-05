import { Box, Typography, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { RouteStepWithChoices } from '../types/api';

interface RouteReviewModalProps {
  open: boolean;
  onClose: () => void;
  steps: RouteStepWithChoices[];
}

export default function RouteReviewModal({ open, onClose, steps }: RouteReviewModalProps) {
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
          {steps.map((step, index) => (
            <Box key={step.term.id} sx={{ width: '100%' }}>
              {/* 用語カード */}
              <Box
                sx={{
                  py: 0.5,
                  px: 1.5,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" fontWeight="medium">
                  {step.term.name}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {step.term.era}
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
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'medium',
                      fontSize: '0.75rem',
                    }}
                  >
                    {step.keyword}
                  </Typography>
                  {step.relation_description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        width: '70%',
                        textAlign: 'center',
                        fontSize: '0.65rem',
                      }}
                    >
                      {step.relation_description}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Modal>
  );
}
