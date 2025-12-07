import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, Tabs, Tab } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { getOverallRanking } from '../services/gameApi';
import type { RankingEntry as ApiRankingEntry } from '../types/api';

interface DisplayRankingEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface RankingTableProps {
  totalStages: number;
  currentUserScore: number;
  currentUserRank: number;
  rankings: ApiRankingEntry[];
  gameId: string;
  onNameChange?: (newName: string) => Promise<void>;
  onShowRoute?: () => void;
}

// APIのランキングデータを表示用に変換し、現在のユーザーをマーク
function buildDisplayRanking(
  apiRankings: ApiRankingEntry[],
  userScore: number,
  userRank: number
): { rankings: DisplayRankingEntry[]; showEllipsis: boolean } {
  // 6位以下の場合：5位まで表示 + 省略 + ユーザー（下部に別途表示）
  if (userRank > 5) {
    const top5 = apiRankings.slice(0, 5).map((entry) => ({
      rank: entry.rank,
      name: entry.user_name,
      score: entry.score,
    }));
    return { rankings: top5, showEllipsis: true };
  }

  // 5位以内の場合：そのまま表示し、自分のエントリをマーク
  const result: DisplayRankingEntry[] = apiRankings.slice(0, 5).map((entry) => ({
    rank: entry.rank,
    name: entry.user_name,
    score: entry.score,
    isCurrentUser: entry.rank === userRank && entry.score === userScore,
  }));
  return { rankings: result, showEllipsis: false };
}

export default function RankingTable({
  totalStages,
  currentUserScore,
  currentUserRank,
  rankings: apiRankings,
  onNameChange,
  onShowRoute,
}: RankingTableProps) {
  const { playerName, setPlayerName } = useGameStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(playerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); // 0: X問ランキング, 1: 全体

  // 全体ランキング用の状態
  const [overallRankings, setOverallRankings] = useState<ApiRankingEntry[]>([]);
  const [overallMyRank, setOverallMyRank] = useState<number>(1);
  const [isLoadingOverall, setIsLoadingOverall] = useState(false);

  // タブ切り替え時に全体ランキングを取得
  useEffect(() => {
    if (tabIndex === 1 && overallRankings.length === 0) {
      const fetchOverallRanking = async () => {
        setIsLoadingOverall(true);
        try {
          const response = await getOverallRanking(currentUserScore);
          setOverallRankings(response.rankings);
          setOverallMyRank(response.my_rank);
        } catch (error) {
          console.error('全体ランキングの取得に失敗:', error);
        } finally {
          setIsLoadingOverall(false);
        }
      };
      fetchOverallRanking();
    }
  }, [tabIndex, currentUserScore, overallRankings.length]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleNameClick = () => {
    setEditingName(playerName);
    setIsEditing(true);
  };

  const handleNameSubmit = async () => {
    if (editingName === playerName) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // APIを呼んで名前を更新（X問ランキングも更新される）
      if (onNameChange) {
        await onNameChange(editingName);
      }
      setPlayerName(editingName);

      // 全体タブ表示中なら即座に再取得、そうでなければクリアして次回取得時に再取得
      if (tabIndex === 1) {
        const response = await getOverallRanking(currentUserScore);
        setOverallRankings(response.rankings);
        setOverallMyRank(response.my_rank);
      } else {
        setOverallRankings([]);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('名前の更新に失敗しました:', error);
      // エラー時は元の名前に戻す
      setEditingName(playerName);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(playerName);
      setIsEditing(false);
    }
  };

  // 現在のタブに応じたランキングデータを取得
  const activeRankings = tabIndex === 0 ? apiRankings : overallRankings;
  const activeMyRank = tabIndex === 0 ? currentUserRank : overallMyRank;

  const { rankings, showEllipsis } = useMemo(
    () => buildDisplayRanking(activeRankings, currentUserScore, activeMyRank),
    [activeRankings, currentUserScore, activeMyRank]
  );

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      {/* タブとルートボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`${totalStages}問`} />
          <Tab label="全体" />
        </Tabs>
        {onShowRoute && (
          <Button
            variant="outlined"
            size="small"
            onClick={onShowRoute}
            sx={{
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              fontSize: '0.875rem',
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
              },
            }}
          >
            ルートを見る
          </Button>
        )}
      </Box>

      {/* ランキングリスト */}
      {isLoadingOverall && tabIndex === 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <Typography color="text.secondary">読み込み中...</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {rankings.map((entry) => (
            <Box
              key={`${entry.rank}-${entry.name}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 1,
                bgcolor: entry.isCurrentUser ? 'transparent' : 'grey.100',
                borderRadius: 1,
                ...(entry.isCurrentUser && {
                  border: '2px solid',
                  borderColor: 'primary.main',
                }),
              }}
            >
              {/* 順位 */}
              <Typography
                sx={{
                  width: '2rem',
                  fontWeight: 'bold',
                  fontSize: entry.rank <= 3 ? '1.1rem' : '1rem',
                  color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'text.primary',
                }}
              >
                {entry.rank}
              </Typography>

              {/* 名前 */}
              {entry.isCurrentUser && isEditing ? (
                <TextField
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={isSubmitting}
                  size="small"
                  variant="standard"
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': {
                      fontWeight: 'bold',
                      color: 'primary.main',
                      py: 0,
                    },
                  }}
                  inputProps={{ maxLength: 20 }}
                />
              ) : (
                <Typography
                  onClick={entry.isCurrentUser ? handleNameClick : undefined}
                  sx={{
                    flex: 1,
                    fontWeight: entry.isCurrentUser ? 'bold' : 'medium',
                    color: entry.isCurrentUser ? 'primary.main' : 'text.primary',
                    cursor: entry.isCurrentUser ? 'pointer' : 'default',
                    '&:hover': entry.isCurrentUser ? { textDecoration: 'underline' } : {},
                  }}
                >
                  {entry.name}
                </Typography>
              )}

              {/* スコア */}
              <Typography
                sx={{
                  fontWeight: 'bold',
                  fontVariantNumeric: 'tabular-nums',
                  color: entry.isCurrentUser ? 'primary.main' : 'text.primary',
                }}
              >
                {entry.score}
              </Typography>
            </Box>
          ))}

          {/* 現在のユーザー（6位以下の場合） */}
          {showEllipsis && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                <Typography color="text.secondary">・・・</Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
                  bgcolor: 'transparent',
                  borderRadius: 1,
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Typography sx={{ width: '2rem', fontWeight: 'bold', color: 'primary.main' }}>
                  {activeMyRank}
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleNameSubmit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    disabled={isSubmitting}
                    size="small"
                    variant="standard"
                    sx={{
                      flex: 1,
                      '& .MuiInputBase-input': {
                        fontWeight: 'bold',
                        color: 'primary.main',
                        py: 0,
                      },
                    }}
                    inputProps={{ maxLength: 20 }}
                  />
                ) : (
                  <Typography
                    onClick={handleNameClick}
                    sx={{
                      flex: 1,
                      fontWeight: 'bold',
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {playerName}
                  </Typography>
                )}
                <Typography sx={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}>
                  {currentUserScore}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
