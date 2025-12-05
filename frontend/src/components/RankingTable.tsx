import { useState, useMemo } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Button, TextField } from '@mui/material';
import { useGameStore } from '../stores/gameStore';

interface RankingEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface RankingTableProps {
  totalStages: number;
  currentUserScore: number;
  currentUserRank?: number;
  onShowRoute?: () => void;
}

// モックデータ（後でAPIに置き換え）
const mockRankingByStages: RankingEntry[] = [
  { rank: 1, name: 'たろう', score: 1850 },
  { rank: 2, name: 'はなこ', score: 1720 },
  { rank: 3, name: 'ゆうき', score: 1680 },
  { rank: 4, name: 'さくら', score: 1550 },
  { rank: 5, name: 'けんた', score: 1420 },
];

const mockRankingAll: RankingEntry[] = [
  { rank: 1, name: 'マスター', score: 4500 },
  { rank: 2, name: 'チャンプ', score: 4200 },
  { rank: 3, name: 'たろう', score: 3800 },
  { rank: 4, name: 'はなこ', score: 3500 },
  { rank: 5, name: 'レジェンド', score: 3200 },
];

type TabType = 'stages' | 'all';

// ユーザーのスコアに基づいて順位を計算し、ランキングに挿入
function buildDisplayRanking(
  baseRanking: RankingEntry[],
  userScore: number,
  userRank: number | undefined,
  playerName: string
): { rankings: RankingEntry[]; showEllipsis: boolean } {
  // ユーザーの順位を計算（スコアベース）
  const calculatedRank = userRank ?? baseRanking.filter((e) => e.score > userScore).length + 1;

  // 5位以内の場合：ユーザーを挿入して繰り下げ
  if (calculatedRank <= 5) {
    const result: RankingEntry[] = [];
    let insertedUser = false;

    for (const entry of baseRanking) {
      // ユーザーの順位に到達したら挿入
      if (!insertedUser && calculatedRank <= entry.rank) {
        result.push({
          rank: calculatedRank,
          name: playerName,
          score: userScore,
          isCurrentUser: true,
        });
        insertedUser = true;
      }

      // 5位までしか表示しない
      if (result.length >= 5) break;

      // ユーザー挿入後は順位を繰り下げ
      result.push({
        ...entry,
        rank: insertedUser ? entry.rank + 1 : entry.rank,
      });

      if (result.length >= 5) break;
    }

    // まだユーザーを挿入していない場合（5位の場合）
    if (!insertedUser && result.length < 5) {
      result.push({
        rank: calculatedRank,
        name: playerName,
        score: userScore,
        isCurrentUser: true,
      });
    }

    return { rankings: result.slice(0, 5), showEllipsis: false };
  }

  // 6位以下の場合：従来通り5位まで表示 + 省略 + ユーザー
  return { rankings: baseRanking.slice(0, 5), showEllipsis: true };
}

export default function RankingTable({ totalStages, currentUserScore, currentUserRank, onShowRoute }: RankingTableProps) {
  const { playerName, setPlayerName } = useGameStore();
  const [activeTab, setActiveTab] = useState<TabType>('stages');
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(playerName);

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabType | null) => {
    if (newValue !== null) {
      setActiveTab(newValue);
    }
  };

  const handleNameClick = () => {
    setEditingName(playerName);
    setIsEditing(true);
  };

  const handleNameSubmit = () => {
    setPlayerName(editingName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(playerName);
      setIsEditing(false);
    }
  };

  const baseRanking = activeTab === 'stages' ? mockRankingByStages : mockRankingAll;

  const { rankings, showEllipsis } = useMemo(
    () => buildDisplayRanking(baseRanking, currentUserScore, currentUserRank, playerName),
    [baseRanking, currentUserScore, currentUserRank, playerName]
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
      {/* タブ切り替え + ルートを見るボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 1.5 }}>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={handleTabChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.5,
              fontWeight: 600,
              fontSize: '0.875rem',
              border: '2px solid',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.main',
                },
              },
            },
          }}
        >
          <ToggleButton value="stages">{totalStages}問</ToggleButton>
          <ToggleButton value="all">全体</ToggleButton>
        </ToggleButtonGroup>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {rankings.map((entry) => (
          <Box
            key={entry.rank}
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
                inputProps={{ maxLength: 10 }}
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
                {currentUserRank ?? baseRanking.filter((e) => e.score > currentUserScore).length + 1}
              </Typography>
              {isEditing ? (
                <TextField
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleKeyDown}
                  autoFocus
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
                  inputProps={{ maxLength: 10 }}
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
    </Box>
  );
}
