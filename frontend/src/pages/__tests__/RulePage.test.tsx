import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RulePage from '../RulePage';

describe('RulePage', () => {
  describe('初期表示', () => {
    it('タイトル「あそびかた」が表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByText('あそびかた')).toBeInTheDocument();
    });

    it('「ゲームへ」ボタンが表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'ゲームへ' })).toBeInTheDocument();
    });

    it('例題の用語（十字軍運動）が表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByText('十字軍運動')).toBeInTheDocument();
    });

    it('正解例（エルサレム）が表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByText('エルサレム')).toBeInTheDocument();
    });

    it('不正解例（冷戦）が表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByText('冷戦')).toBeInTheDocument();
    });

    it('ルール説明テキストが表示される', () => {
      render(<RulePage onStart={vi.fn()} />);
      expect(screen.getByText(/もっとも関係が深い用語をタップ/)).toBeInTheDocument();
      expect(screen.getByText('ライフ0でゲームオーバー')).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('「ゲームへ」ボタンクリックでonStartが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnStart = vi.fn();
      render(<RulePage onStart={mockOnStart} />);

      await user.click(screen.getByRole('button', { name: 'ゲームへ' }));
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });
});
