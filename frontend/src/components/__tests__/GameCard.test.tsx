import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameCard from '../GameCard';

describe('GameCard', () => {
  it('用語名を正しく表示する', () => {
    render(<GameCard term="ペリー来航" era="近世" />);
    expect(screen.getByText('ペリー来航')).toBeInTheDocument();
  });

  it('時代を正しく表示する', () => {
    render(<GameCard term="ペリー来航" era="近世" />);
    expect(screen.getByText('近世')).toBeInTheDocument();
  });

  it('異なる用語でも正しく表示される', () => {
    render(<GameCard term="明治維新" era="近代" />);
    expect(screen.getByText('明治維新')).toBeInTheDocument();
    expect(screen.getByText('近代')).toBeInTheDocument();
  });

  it('カードが正しくレンダリングされる', () => {
    const { container } = render(<GameCard term="テスト用語" era="現代" />);
    // MUI Paperコンポーネントが存在することを確認
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });
});
