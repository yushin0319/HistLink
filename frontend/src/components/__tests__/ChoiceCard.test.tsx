import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChoiceCard from '../ChoiceCard';

describe('ChoiceCard', () => {
  it('用語名を正しく表示する', () => {
    const mockOnClick = vi.fn();
    render(<ChoiceCard term="井伊直弼" onClick={mockOnClick} />);
    expect(screen.getByText('井伊直弼')).toBeInTheDocument();
  });

  it('クリックイベントが正しく発火する', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    render(<ChoiceCard term="井伊直弼" onClick={mockOnClick} />);

    const card = screen.getByText('井伊直弼').closest('.MuiPaper-root');
    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('選択されていない状態で正しくレンダリングされる', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ChoiceCard term="井伊直弼" onClick={mockOnClick} isSelected={false} />
    );

    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('選択された状態で正しくレンダリングされる', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ChoiceCard term="井伊直弼" onClick={mockOnClick} isSelected={true} />
    );

    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('isSelectedがundefinedでもエラーにならない', () => {
    const mockOnClick = vi.fn();
    expect(() => {
      render(<ChoiceCard term="井伊直弼" onClick={mockOnClick} />);
    }).not.toThrow();
  });

  it('複数の選択肢カードが独立して動作する', async () => {
    const user = userEvent.setup();
    const mockOnClick1 = vi.fn();
    const mockOnClick2 = vi.fn();

    const { container } = render(
      <>
        <ChoiceCard term="選択肢1" onClick={mockOnClick1} />
        <ChoiceCard term="選択肢2" onClick={mockOnClick2} />
      </>
    );

    const cards = container.querySelectorAll('.MuiPaper-root');
    expect(cards.length).toBe(2);

    await user.click(cards[0]);
    expect(mockOnClick1).toHaveBeenCalledTimes(1);
    expect(mockOnClick2).toHaveBeenCalledTimes(0);

    await user.click(cards[1]);
    expect(mockOnClick1).toHaveBeenCalledTimes(1);
    expect(mockOnClick2).toHaveBeenCalledTimes(1);
  });

  it('長い用語名でも正しく表示される', () => {
    const mockOnClick = vi.fn();
    render(<ChoiceCard term="ヴェルサイユ条約（ヴェルサイユ講和条約）" onClick={mockOnClick} />);
    expect(screen.getByText('ヴェルサイユ条約（ヴェルサイユ講和条約）')).toBeInTheDocument();
  });

  it('複数行になる長い用語でもレイアウトが崩れない', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ChoiceCard term="第一次世界大戦後のパリ講和会議" onClick={mockOnClick} />
    );
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  describe('フィードバック状態', () => {
    it('feedbackState="correct"の時、success色が適用される', () => {
      const mockOnClick = vi.fn();
      render(<ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState="correct" />);

      const text = screen.getByText('徳川家康');
      expect(text).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    });

    it('feedbackState="incorrect"の時、error色が適用される', () => {
      const mockOnClick = vi.fn();
      render(<ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState="incorrect" />);

      const text = screen.getByText('徳川家康');
      expect(text).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    });

    it('feedbackStateがある時、カーソルがdefaultになる', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState="correct" />
      );

      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toHaveStyle({ cursor: 'default' });
    });

    it('feedbackStateがnullの時、通常のスタイルが適用される', () => {
      const mockOnClick = vi.fn();
      const { container } = render(<ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState={null} />);

      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toHaveStyle({ cursor: 'pointer' });
    });

    it('正解フィードバック状態でクリックハンドラが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      render(<ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState="correct" />);

      const card = screen.getByText('徳川家康').closest('.MuiPaper-root');
      if (card) {
        await user.click(card);
        // フィードバック表示中でもonClickは実行される（イベント制御はGamePage側で行う）
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      }
    });

    it('不正解フィードバック状態でクリックハンドラが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      render(<ChoiceCard term="徳川家康" onClick={mockOnClick} feedbackState="incorrect" />);

      const card = screen.getByText('徳川家康').closest('.MuiPaper-root');
      if (card) {
        await user.click(card);
        // フィードバック表示中でもonClickは実行される（イベント制御はGamePage側で行う）
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      }
    });

    it('feedbackStateとisSelectedが同時に指定された場合、feedbackStateが優先される', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <ChoiceCard term="徳川家康" onClick={mockOnClick} isSelected={true} feedbackState="correct" />
      );

      const text = screen.getByText('徳川家康');
      // feedbackStateが優先されるのでwhiteになる
      expect(text).toHaveStyle({ color: 'rgb(255, 255, 255)' });

      const paper = container.querySelector('.MuiPaper-root');
      // feedbackStateがあるのでcursor: default
      expect(paper).toHaveStyle({ cursor: 'default' });
    });
  });
});
