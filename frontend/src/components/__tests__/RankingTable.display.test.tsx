import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankingTable from '../RankingTable';
import { useGameStore } from '../../stores/gameStore';
import type { RankingEntry } from '../../types/api';

// テスト用のランキングデータ
const mockRankings: RankingEntry[] = [
  { rank: 1, user_name: 'たろう', score: 1800, cleared_steps: 10 },
  { rank: 2, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
  { rank: 3, user_name: 'じろう', score: 1600, cleared_steps: 10 },
  { rank: 4, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
  { rank: 5, user_name: 'しろう', score: 1400, cleared_steps: 10 },
];

// 全体ランキング用のモックデータ
const mockOverallRankings: RankingEntry[] = [
  { rank: 1, user_name: '全体1位', score: 5000, cleared_steps: 50 },
  { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
  { rank: 3, user_name: '全体3位', score: 4000, cleared_steps: 50 },
  { rank: 4, user_name: '全体4位', score: 3500, cleared_steps: 30 },
  { rank: 5, user_name: '全体5位', score: 3000, cleared_steps: 30 },
];

describe('RankingTable 表示', () => {
  beforeEach(() => {
    useGameStore.setState({ playerName: 'テストユーザー' });
  });

  afterEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('初期表示', () => {
    it('タブが表示される（X問/全体）', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.getByRole('tab', { name: '10問' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '全体' })).toBeInTheDocument();
    });

    it('ランキングリストが表示される', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.getByText('たろう')).toBeInTheDocument();
      expect(screen.getByText('はなこ')).toBeInTheDocument();
    });

    it('onShowRouteが渡された場合、ルートを見るボタンが表示される', () => {
      const mockOnShowRoute = vi.fn();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
          onShowRoute={mockOnShowRoute}
        />
      );

      expect(screen.getByRole('button', { name: /ルートを見る/i })).toBeInTheDocument();
    });

    it('onShowRouteが渡されない場合、ルートを見るボタンは表示されない', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.queryByRole('button', { name: /ルートを見る/i })).not.toBeInTheDocument();
    });
  });

  describe('タブ切り替え', () => {
    it('全体タブをクリックすると全体ランキングが表示される', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      await waitFor(() => {
        expect(screen.getByText('全体1位')).toBeInTheDocument();
      });
    });

    it('X問タブをクリックすると難易度別ランキングが表示される', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      await user.click(screen.getByRole('tab', { name: '全体' }));
      await user.click(screen.getByRole('tab', { name: '10問' }));

      expect(screen.getByText('たろう')).toBeInTheDocument();
    });

    it('タブのステージ数がtotalStagesに応じて変わる', () => {
      render(
        <RankingTable
          totalStages={30}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.getByRole('tab', { name: '30問' })).toBeInTheDocument();
    });
  });

  describe('ルートを見るボタン', () => {
    it('クリックするとonShowRouteが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnShowRoute = vi.fn();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
          onShowRoute={mockOnShowRoute}
        />
      );

      const showRouteButton = screen.getByRole('button', { name: /ルートを見る/i });
      await user.click(showRouteButton);

      expect(mockOnShowRoute).toHaveBeenCalledTimes(1);
    });
  });

  describe('ランキング順位計算', () => {
    it('スコアが高いとランキング上位に入る（5位以内）', () => {
      const rankingsWithSelf: RankingEntry[] = [
        { rank: 1, user_name: 'テストユーザー', score: 2000, cleared_steps: 10 },
        { rank: 2, user_name: 'たろう', score: 1800, cleared_steps: 10 },
        { rank: 3, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
        { rank: 4, user_name: 'じろう', score: 1600, cleared_steps: 10 },
        { rank: 5, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
      ];
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={2000}
          currentUserRank={1}
          rankings={rankingsWithSelf}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
        />
      );

      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('2000')).toBeInTheDocument();
    });

    it('スコアが低いと省略表示になる（6位以下）', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={100}
          currentUserRank={10}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={10}
          gameId="test-game-id"
        />
      );

      expect(screen.getByText('・・・')).toBeInTheDocument();
    });
  });

  describe('ステージ数の表示', () => {
    it('totalStagesに応じてタブが変わる', () => {
      render(
        <RankingTable
          totalStages={30}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.getByRole('tab', { name: '30問' })).toBeInTheDocument();
    });

    it('50問の場合も正しく表示される', () => {
      render(
        <RankingTable
          totalStages={50}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          overallRankings={mockOverallRankings}
          overallMyRank={5}
          gameId="test-game-id"
        />
      );

      expect(screen.getByRole('tab', { name: '50問' })).toBeInTheDocument();
    });
  });
});
