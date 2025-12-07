import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameCard from '../GameCard';

describe('GameCard', () => {
  it('用語名を正しく表示する', () => {
    render(<GameCard term="ペリー来航" category="近世" />);
    expect(screen.getByText('ペリー来航')).toBeInTheDocument();
  });

  it('カテゴリを正しく表示する', () => {
    render(<GameCard term="ペリー来航" category="近世" />);
    expect(screen.getByText('近世')).toBeInTheDocument();
  });

  it('異なる用語でも正しく表示される', () => {
    render(<GameCard term="明治維新" category="近代" />);
    expect(screen.getByText('明治維新')).toBeInTheDocument();
    expect(screen.getByText('近代')).toBeInTheDocument();
  });

  it('カードが正しくレンダリングされる', () => {
    const { container } = render(<GameCard term="テスト用語" category="現代" />);
    // MUI Paperコンポーネントが存在することを確認
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('descriptionが提供された場合は表示される', () => {
    render(
      <GameCard
        term="サンフランシスコ平和条約"
        category="現代"
        description="1951年に調印された第二次世界大戦の講和条約。日本の主権回復と占領終結を実現し、戦後の国際社会への復帰を果たした。"
      />
    );
    expect(screen.getByText(/1951年に調印された/)).toBeInTheDocument();
  });

  it('descriptionが未提供の場合はエラーにならない', () => {
    expect(() => {
      render(<GameCard term="井伊直弼" category="近代" />);
    }).not.toThrow();
  });

  it('長いdescriptionでもレイアウトが崩れない', () => {
    const { container } = render(
      <GameCard
        term="サンフランシスコ平和条約"
        category="現代"
        description="1951年に調印された第二次世界大戦の講和条約。日本の主権回復と占領終結を実現し、戦後の国際社会への復帰を果たした。"
      />
    );
    // MUI Paperコンポーネントが正常に存在することを確認
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
    // 長いdescriptionが表示されることを確認
    expect(screen.getByText(/1951年に調印された第二次世界大戦の講和条約/)).toBeInTheDocument();
  });
});
