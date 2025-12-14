import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectPage from '../SelectPage';
import { useGameStore } from '../../stores/gameStore';

// モック化
vi.mock('../../stores/gameStore');

describe('SelectPage', () => {
  const mockRequestStartGame = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      requestStartGame: mockRequestStartGame,
    });
  });

  describe('初期表示', () => {
    it('タイトルが表示される', () => {
      render(<SelectPage />);
      expect(screen.getByText('HistLink')).toBeInTheDocument();
    });

    it('難易度選択ボタンが3つ表示される', () => {
      render(<SelectPage />);
      expect(screen.getByRole('button', { name: /かんたん/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ふつう/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /難しい/i })).toBeInTheDocument();
    });

    it('ステージ数選択ボタンが3つ表示される', () => {
      render(<SelectPage />);
      expect(screen.getByRole('button', { name: /10問/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /30問/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /50問/i })).toBeInTheDocument();
    });

    it('スタートボタンが表示される', () => {
      render(<SelectPage />);
      expect(screen.getByRole('button', { name: /スタート/i })).toBeInTheDocument();
    });

    it('初期状態では「ふつう」と「10問」が選択されている', () => {
      render(<SelectPage />);
      const normalButton = screen.getByRole('button', { name: /ふつう/i });
      const stage10Button = screen.getByRole('button', { name: /10問/i });

      // variant="contained"がデフォルト選択状態を示す
      expect(normalButton).toHaveAttribute('data-selected', 'true');
      expect(stage10Button).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('難易度選択', () => {
    it('かんたんボタンをクリックすると選択状態になる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const easyButton = screen.getByRole('button', { name: /かんたん/i });
      await user.click(easyButton);

      expect(easyButton).toHaveAttribute('data-selected', 'true');
    });

    it('むずかしいボタンをクリックすると選択状態になる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const hardButton = screen.getByRole('button', { name: /難しい/i });
      await user.click(hardButton);

      expect(hardButton).toHaveAttribute('data-selected', 'true');
    });

    it('難易度ボタンは1つだけ選択できる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const easyButton = screen.getByRole('button', { name: /かんたん/i });
      const normalButton = screen.getByRole('button', { name: /ふつう/i });

      // かんたんを選択
      await user.click(easyButton);
      expect(easyButton).toHaveAttribute('data-selected', 'true');
      expect(normalButton).toHaveAttribute('data-selected', 'false');

      // ふつうを選択
      await user.click(normalButton);
      expect(normalButton).toHaveAttribute('data-selected', 'true');
      expect(easyButton).toHaveAttribute('data-selected', 'false');
    });
  });

  describe('ステージ数選択', () => {
    it('30問ボタンをクリックすると選択状態になる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const stage30Button = screen.getByRole('button', { name: /30問/i });
      await user.click(stage30Button);

      expect(stage30Button).toHaveAttribute('data-selected', 'true');
    });

    it('50問ボタンをクリックすると選択状態になる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const stage50Button = screen.getByRole('button', { name: /50問/i });
      await user.click(stage50Button);

      expect(stage50Button).toHaveAttribute('data-selected', 'true');
    });

    it('ステージ数ボタンは1つだけ選択できる', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const stage10Button = screen.getByRole('button', { name: /10問/i });
      const stage30Button = screen.getByRole('button', { name: /30問/i });

      // 30問を選択
      await user.click(stage30Button);
      expect(stage30Button).toHaveAttribute('data-selected', 'true');
      expect(stage10Button).toHaveAttribute('data-selected', 'false');

      // 10問を選択
      await user.click(stage10Button);
      expect(stage10Button).toHaveAttribute('data-selected', 'true');
      expect(stage30Button).toHaveAttribute('data-selected', 'false');
    });
  });

  describe('選択の保護', () => {
    it('同じ難易度ボタンを再クリックしても選択は維持される', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const normalButton = screen.getByRole('button', { name: /ふつう/i });

      // 初期状態で選択されている
      expect(normalButton).toHaveAttribute('data-selected', 'true');

      // 同じボタンを再クリック
      await user.click(normalButton);

      // 選択は維持される
      expect(normalButton).toHaveAttribute('data-selected', 'true');
    });

    it('同じステージ数ボタンを再クリックしても選択は維持される', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const stage10Button = screen.getByRole('button', { name: /10問/i });

      // 初期状態で選択されている
      expect(stage10Button).toHaveAttribute('data-selected', 'true');

      // 同じボタンを再クリック
      await user.click(stage10Button);

      // 選択は維持される
      expect(stage10Button).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('ゲーム開始', () => {
    it('スタートボタンをクリックするとrequestStartGameが呼ばれる（デフォルト: normal, 10）', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      const startButton = screen.getByRole('button', { name: /スタート/i });
      await user.click(startButton);

      expect(mockRequestStartGame).toHaveBeenCalledWith('normal', 10);
      expect(mockRequestStartGame).toHaveBeenCalledTimes(1);
    });

    it('選択した難易度とステージ数でrequestStartGameが呼ばれる（easy, 30）', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      // かんたん + 30問を選択
      await user.click(screen.getByRole('button', { name: /かんたん/i }));
      await user.click(screen.getByRole('button', { name: /30問/i }));

      const startButton = screen.getByRole('button', { name: /スタート/i });
      await user.click(startButton);

      expect(mockRequestStartGame).toHaveBeenCalledWith('easy', 30);
    });

    it('選択した難易度とステージ数でrequestStartGameが呼ばれる（hard, 50）', async () => {
      const user = userEvent.setup();
      render(<SelectPage />);

      // むずかしい + 50問を選択
      await user.click(screen.getByRole('button', { name: /難しい/i }));
      await user.click(screen.getByRole('button', { name: /50問/i }));

      const startButton = screen.getByRole('button', { name: /スタート/i });
      await user.click(startButton);

      expect(mockRequestStartGame).toHaveBeenCalledWith('hard', 50);
    });
  });
});
