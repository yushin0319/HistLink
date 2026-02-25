import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankingTable from '../RankingTable';
import { useGameStore } from '../../stores/gameStore';
import type { RankingEntry } from '../../types/api';

// プレイヤー名編集テスト用のランキング（自分のエントリを含む）
const mockRankingsWithCurrentUser: RankingEntry[] = [
  { rank: 1, user_name: 'テストユーザー', score: 1900, cleared_steps: 10 },
  { rank: 2, user_name: 'たろう', score: 1800, cleared_steps: 10 },
  { rank: 3, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
  { rank: 4, user_name: 'じろう', score: 1600, cleared_steps: 10 },
  { rank: 5, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
];

// 6位以下テスト用（自分を含まないランキング）
const mockRankings: RankingEntry[] = [
  { rank: 1, user_name: 'たろう', score: 1800, cleared_steps: 10 },
  { rank: 2, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
  { rank: 3, user_name: 'じろう', score: 1600, cleared_steps: 10 },
  { rank: 4, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
  { rank: 5, user_name: 'しろう', score: 1400, cleared_steps: 10 },
];

const mockOverallRankings: RankingEntry[] = [
  { rank: 1, user_name: '全体1位', score: 5000, cleared_steps: 50 },
  { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
  { rank: 3, user_name: '全体3位', score: 4000, cleared_steps: 50 },
  { rank: 4, user_name: '全体4位', score: 3500, cleared_steps: 30 },
  { rank: 5, user_name: '全体5位', score: 3000, cleared_steps: 30 },
];

describe('RankingTable 名前編集', () => {
  beforeEach(() => {
    useGameStore.setState({ playerName: 'テストユーザー' });
  });

  afterEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('プレイヤー名編集', () => {
    it('自分の名前をクリックすると編集モードになる', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('名前を編集してEnterで確定できる', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '新しい名前{Enter}');

      expect(useGameStore.getState().playerName).toBe('新しい名前');
    });

    it('Escapeで編集をキャンセルできる', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '変更中{Escape}');

      expect(useGameStore.getState().playerName).toBe('テストユーザー');
    });

    it('フォーカスを外すと編集が確定される', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'blur確認');
      await user.tab();

      await waitFor(() => {
        expect(useGameStore.getState().playerName).toBe('blur確認');
      });
    });
  });

  describe('名前変更APIコールバック', () => {
    it('onNameChangeが渡された場合、名前変更時にコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'API経由名前{Enter}');

      await waitFor(() => {
        expect(mockOnNameChange).toHaveBeenCalledWith('API経由名前');
      });
    });

    it('onNameChangeがエラーを投げた場合、元の名前に戻る', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'エラーテスト{Enter}');

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(useGameStore.getState().playerName).toBe('テストユーザー');

      consoleSpy.mockRestore();
    });

    it('全体タブに切り替えると全体ランキングのデータが表示される', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      await waitFor(() => {
        expect(screen.getByText('全体1位')).toBeInTheDocument();
        expect(screen.getByText('全体2位')).toBeInTheDocument();
      });
    });
  });

  describe('6位以下の編集', () => {
    it('6位以下でも名前を編集できる', async () => {
      const user = userEvent.setup();

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

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      expect(screen.getByRole('textbox')).toBeInTheDocument();

      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '新しい名前{Enter}');

      expect(useGameStore.getState().playerName).toBe('新しい名前');
    });
  });

  describe('エラーハンドリング', () => {
    it('名前が変更されていない場合は早期リターンする', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          overallRankings={mockOverallRankings}
          overallMyRank={1}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      const textField = screen.getByRole('textbox');
      await user.type(textField, '{Enter}');

      expect(mockOnNameChange).not.toHaveBeenCalled();
      expect(useGameStore.getState().playerName).toBe('テストユーザー');
    });
  });
});
