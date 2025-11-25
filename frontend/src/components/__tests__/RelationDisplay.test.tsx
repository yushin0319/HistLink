import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RelationDisplay from '../RelationDisplay';

describe('RelationDisplay', () => {
  it('show=trueの時、keywordとexplanationが表示される', () => {
    render(
      <RelationDisplay
        keyword="女王卑弥呼"
        explanation="邪馬台国を統治した女王"
        show={true}
      />
    );

    expect(screen.getByText('女王卑弥呼')).toBeInTheDocument();
    expect(screen.getByText('邪馬台国を統治した女王')).toBeInTheDocument();
  });

  it('show=falseの時も要素は存在するが、Fadeで非表示になる', () => {
    render(
      <RelationDisplay
        keyword="女王卑弥呼"
        explanation="邪馬台国を統治した女王"
        show={false}
      />
    );

    // Fadeコンポーネントでも要素自体は存在する
    expect(screen.getByText('女王卑弥呼')).toBeInTheDocument();
    expect(screen.getByText('邪馬台国を統治した女王')).toBeInTheDocument();
  });

  it('keywordが空文字でも正常に表示される', () => {
    render(
      <RelationDisplay
        keyword=""
        explanation="説明文"
        show={true}
      />
    );

    expect(screen.getByText('説明文')).toBeInTheDocument();
  });

  it('explanationが空文字でも正常に表示される', () => {
    render(
      <RelationDisplay
        keyword="キーワード"
        explanation=""
        show={true}
      />
    );

    expect(screen.getByText('キーワード')).toBeInTheDocument();
  });

  it('両方空文字でも正常にレンダリングされる', () => {
    const { container } = render(
      <RelationDisplay
        keyword=""
        explanation=""
        show={true}
      />
    );

    // エラーなくレンダリングされる
    expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
  });
});
