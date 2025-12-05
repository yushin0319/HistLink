import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankingTable from '../RankingTable';
import { useGameStore } from '../../stores/gameStore';

// モック化
vi.mock('../../stores/gameStore');

describe('RankingTable', () => {
  const mockSetPlayerName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      playerName: 'テストユーザー',
      setPlayerName: mockSetPlayerName,
    });
  });

  describe('初期表示', () => {
    it('タブボタンが2つ表示される', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
        />
      );

      expect(screen.getByRole('button', { name: /10問/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /全体/i })).toBeInTheDocument();
    });

    it('初期状態ではステージタブが選択されている', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
        />
      );

      const stagesTab = screen.getByRole('button', { name: /10問/i });
      expect(stagesTab).toHaveAttribute('aria-pressed', 'true');
    });

    it('ランキングリストが表示される', () => {
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
        />
      );

      // モックランキングのユーザー名が表示される
      expect(screen.getByText('たろう')).toBeInTheDocument();
      expect(screen.getByText('はなこ')).toBeInTheDocument();
    });

    it('onShowRouteが渡された場合、ルートを見るボタンが表示される', () => {
      const mockOnShowRoute = vi.fn();
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={1500}
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
        />
      );

      const allTab = screen.getByRole('button', { name: /全体/i });
      await user.click(allTab);

      // 全体ランキングのユーザー名が表示される
      expect(screen.getByText('マスター')).toBeInTheDocument();
      expect(screen.getByText('チャンプ')).toBeInTheDocument();
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
      expect(mockSetPlayerName).toHaveBeenCalledWith('blur確認');
    });
  });

  describe('ランキング順位計算', () => {
    it('スコアが高いとランキング上位に入る', () => {
      // 最高スコア（1位になるスコア）
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={2000}
        />
      );

      // 自分のエントリが表示される
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('2000')).toBeInTheDocument();
    });

    it('スコアが低いと省略表示になる', () => {
      // 低いスコア（6位以下）
      render(
        <RankingTable
          totalStages={10}
          currentUserScore={100}
        />
      );

      // 省略記号が表示される
      expect(screen.getByText('・・・')).toBeInTheDocument();
    });
  });

  describe('ステージ数の表示', () => {
    it('totalStagesに応じてタブラベルが変わる', () => {
      render(
        <RankingTable
          totalStages={30}
          currentUserScore={1500}
        />
      );

      expect(screen.getByRole('button', { name: /30問/i })).toBeInTheDocument();
    });

    it('50問の場合も正しく表示される', () => {
      render(
        <RankingTable
          totalStages={50}
          currentUserScore={1500}
        />
      );

      expect(screen.getByRole('button', { name: /50問/i })).toBeInTheDocument();
    });
  });
});
