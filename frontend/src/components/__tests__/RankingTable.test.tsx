import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankingTable from '../RankingTable';
import { useGameStore } from '../../stores/gameStore';
import type { RankingEntry } from '../../types/api';

// モック化
vi.mock('../../stores/gameStore');

// gameApi のモック
import { getOverallRanking } from '../../services/gameApi';
vi.mock('../../services/gameApi', () => ({
  getOverallRanking: vi.fn(),
}));
const mockGetOverallRanking = vi.mocked(getOverallRanking);

// テスト用のランキングデータ
const mockRankings: RankingEntry[] = [
  { rank: 1, user_name: 'たろう', score: 1800, cleared_steps: 10 },
  { rank: 2, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
  { rank: 3, user_name: 'じろう', score: 1600, cleared_steps: 10 },
  { rank: 4, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
  { rank: 5, user_name: 'しろう', score: 1400, cleared_steps: 10 },
];

// プレイヤー名編集テスト用のランキング（自分のエントリを含む）
const mockRankingsWithCurrentUser: RankingEntry[] = [
  { rank: 1, user_name: 'テストユーザー', score: 1900, cleared_steps: 10 },
  { rank: 2, user_name: 'たろう', score: 1800, cleared_steps: 10 },
  { rank: 3, user_name: 'はなこ', score: 1700, cleared_steps: 10 },
  { rank: 4, user_name: 'じろう', score: 1600, cleared_steps: 10 },
  { rank: 5, user_name: 'さぶろう', score: 1500, cleared_steps: 10 },
];

describe('RankingTable', () => {
  const mockSetPlayerName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      playerName: 'テストユーザー',
      setPlayerName: mockSetPlayerName,
    });
    // デフォルトのモック動作を設定
    mockGetOverallRanking.mockResolvedValue({
      my_rank: 5,
      rankings: [
        { rank: 1, user_name: '全体1位', score: 5000, cleared_steps: 50 },
        { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
        { rank: 3, user_name: '全体3位', score: 4000, cleared_steps: 50 },
        { rank: 4, user_name: '全体4位', score: 3500, cleared_steps: 30 },
        { rank: 5, user_name: '全体5位', score: 3000, cleared_steps: 30 },
      ],
    });
  });

  describe('初期表示', () => {
    it('タブが表示される（X問/全体）', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
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
          gameId="test-game-id"
        />
      );

      // ランキングのユーザー名が表示される
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
          gameId="test-game-id"
        />
      );

      // 全体タブをクリック
      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      // 全体ランキングのデータが表示される
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
          gameId="test-game-id"
        />
      );

      // 一度全体タブへ
      await user.click(screen.getByRole('tab', { name: '全体' }));

      // 10問タブをクリック
      await user.click(screen.getByRole('tab', { name: '10問' }));

      // 難易度別ランキングに戻る
      expect(screen.getByText('たろう')).toBeInTheDocument();
    });

    it('タブのステージ数がtotalStagesに応じて変わる', () => {
      render(
        <RankingTable
          totalStages={30}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
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
          gameId="test-game-id"
          onShowRoute={mockOnShowRoute}
        />
      );

      const showRouteButton = screen.getByRole('button', { name: /ルートを見る/i });
      await user.click(showRouteButton);

      expect(mockOnShowRoute).toHaveBeenCalledTimes(1);
    });
  });

  describe('プレイヤー名編集', () => {
    it('自分の名前をクリックすると編集モードになる', async () => {
      const user = userEvent.setup();
      // ユーザーが5位以内に入るスコアを設定
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // TextFieldが表示される
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
          gameId="test-game-id"
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '新しい名前{Enter}');

      // setPlayerNameが呼ばれる
      expect(mockSetPlayerName).toHaveBeenCalledWith('新しい名前');
    });

    it('Escapeで編集をキャンセルできる', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更してEscape
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '変更中{Escape}');

      // setPlayerNameは呼ばれない
      expect(mockSetPlayerName).not.toHaveBeenCalled();
    });

    it('フォーカスを外すと編集が確定される', async () => {
      const user = userEvent.setup();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更してフォーカスを外す
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'blur確認');
      await user.tab();

      // setPlayerNameが呼ばれる
      await waitFor(() => {
        expect(mockSetPlayerName).toHaveBeenCalledWith('blur確認');
      });
    });
  });

  describe('ランキング順位計算', () => {
    it('スコアが高いとランキング上位に入る（5位以内）', () => {
      // 1位になるスコア（自分を含むランキングを使用）
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
          gameId="test-game-id"
        />
      );

      // 自分のエントリが表示される
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('2000')).toBeInTheDocument();
    });

    it('スコアが低いと省略表示になる（6位以下）', () => {
      // 低いスコア（6位以下）
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={100}
          currentUserRank={10}
          rankings={mockRankings}
          gameId="test-game-id"
        />
      );

      // 省略記号が表示される
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
          gameId="test-game-id"
        />
      );

      expect(screen.getByRole('tab', { name: '50問' })).toBeInTheDocument();
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
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'API経由名前{Enter}');

      // onNameChangeが呼ばれる
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
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, 'エラーテスト{Enter}');

      // エラーがログに出力される
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // setPlayerNameは呼ばれない（エラー時は元の名前に戻る）
      expect(mockSetPlayerName).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('全体タブ表示中に名前を変更すると全体ランキングが再取得される', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      // 全体タブをクリック
      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      // 全体ランキングが表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByText('全体1位')).toBeInTheDocument();
      });

      // 自分の名前をクリック（全体タブでの5位）
      // 省略記号が表示されている場合、6位以下の自分のエントリが表示される
      // ここでは5位以内なので普通に表示される
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
          gameId="test-game-id"
        />
      );

      // 省略記号が表示される
      expect(screen.getByText('・・・')).toBeInTheDocument();

      // 自分の名前をクリック（省略記号の下に表示される）
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // TextFieldが表示される
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // 名前を変更
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '新しい名前{Enter}');

      // setPlayerNameが呼ばれる
      expect(mockSetPlayerName).toHaveBeenCalledWith('新しい名前');
    });
  });

  describe('エラーハンドリング', () => {
    it('全体ランキング取得失敗時にエラーがログに出力される', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetOverallRanking.mockRejectedValue(new Error('API Error'));

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
          currentUserRank={4}
          rankings={mockRankings}
          gameId="test-game-id"
        />
      );

      // 全体タブをクリック
      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      // エラーがログに出力される
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('全体ランキングの取得に失敗:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('名前が変更されていない場合は早期リターンする', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1900}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      // 自分の名前をクリック
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更せずにEnter（同じ名前のまま）
      const textField = screen.getByRole('textbox');
      await user.type(textField, '{Enter}');

      // onNameChangeは呼ばれない（名前が同じなので）
      expect(mockOnNameChange).not.toHaveBeenCalled();
      // setPlayerNameも呼ばれない
      expect(mockSetPlayerName).not.toHaveBeenCalled();
    });

    it('全体タブ表示中に名前を変更すると全体ランキングが再取得される', async () => {
      const user = userEvent.setup();
      const mockOnNameChange = vi.fn().mockResolvedValue(undefined);

      // 全体ランキングで自分が1位のモックデータを設定
      mockGetOverallRanking.mockResolvedValue({
        my_rank: 1,
        rankings: [
          { rank: 1, user_name: 'テストユーザー', score: 5500, cleared_steps: 50 },
          { rank: 2, user_name: '全体2位', score: 4500, cleared_steps: 50 },
          { rank: 3, user_name: '全体3位', score: 4000, cleared_steps: 50 },
          { rank: 4, user_name: '全体4位', score: 3500, cleared_steps: 30 },
          { rank: 5, user_name: '全体5位', score: 3000, cleared_steps: 30 },
        ],
      });

      render(
        <RankingTable
          totalStages={10}
          currentUserScore={5500}
          currentUserRank={1}
          rankings={mockRankingsWithCurrentUser}
          gameId="test-game-id"
          onNameChange={mockOnNameChange}
        />
      );

      // 全体タブをクリック
      const overallTab = screen.getByRole('tab', { name: '全体' });
      await user.click(overallTab);

      // 全体ランキングが表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByText('全体2位')).toBeInTheDocument();
      });

      // 最初の呼び出し回数を記録
      const initialCallCount = mockGetOverallRanking.mock.calls.length;

      // 自分の名前をクリック（全体1位として表示されている）
      const playerName = screen.getByText('テストユーザー');
      await user.click(playerName);

      // 名前を変更
      const textField = screen.getByRole('textbox');
      await user.clear(textField);
      await user.type(textField, '更新後名前{Enter}');

      // getOverallRankingが再度呼ばれる
      await waitFor(() => {
        expect(mockGetOverallRanking.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
