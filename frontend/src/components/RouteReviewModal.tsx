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
  // falseSteps[i]は「ステージi→i+1のエッジでミス」を意味する
  // エッジ: 3回目のミス+1以降をグレー表示（3回目のエッジ自体は赤で見せる）
  const thirdFalseStep = falseSteps.length >= 3 ? falseSteps[2] : -1;
  const edgeGrayStart = thirdFalseStep >= 0 ? thirdFalseStep + 1 : -1;
  // term: 3回目のミス+2以降をグレー表示（3回目のミス先のtermは赤枠で見せる）
  const termGrayStart = thirdFalseStep >= 0 ? thirdFalseStep + 2 : -1;
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
            // エッジ: edgeGrayStart以降はグレー表示
            const isEdgeGray = edgeGrayStart >= 0 && index >= edgeGrayStart;
            // term: termGrayStart以降はグレー表示
            const isTermGray = termGrayStart >= 0 && index >= termGrayStart;
            // このステージのエッジでミスしたか（index→index+1の遷移でミス）
            const isEdgeFalse = falseSteps.includes(index);
            // このtermがミスの結果か（前のエッジでミス → このtermに赤枠）
            const isTermFalse = falseSteps.includes(index - 1);

            return (
              <Box key={step.term.id} sx={{ width: '100%' }}>
                {/* 用語カード */}
                <Box
                  sx={{
                    py: 0.5,
                    px: 1.5,
                    border: isTermFalse ? '2px solid' : '1px solid',
                    borderColor: isTermFalse ? 'error.main' : 'grey.300',
                    borderRadius: 1,
                    textAlign: 'center',
                    opacity: isTermGray ? 0.4 : 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ color: isTermGray ? 'text.disabled' : 'text.primary' }}
                  >
                    {step.term.name}
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
                      opacity: isEdgeGray ? 0.4 : 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: isEdgeGray ? 'text.disabled' : isEdgeFalse ? 'error.main' : 'primary.main',
                        fontWeight: 'medium',
                        fontSize: '0.75rem',
                      }}
                    >
                      {step.keyword}
                    </Typography>
                    {step.edge_description && (
                      <Typography
                        variant="caption"
                        sx={{
                          width: '70%',
                          textAlign: 'center',
                          fontSize: '0.65rem',
                          color: isEdgeGray ? 'text.disabled' : 'text.secondary',
                        }}
                      >
                        {step.edge_description}
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
