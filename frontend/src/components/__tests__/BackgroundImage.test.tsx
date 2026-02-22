import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BackgroundImage from '../BackgroundImage';

describe('BackgroundImage', () => {
  it('img要素がレンダリングされる', () => {
    const { container } = render(<BackgroundImage />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('画像ソースが正しい', () => {
    const { container } = render(<BackgroundImage />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/histlink-bg.png');
  });

  it('alt属性が空（装飾画像）', () => {
    const { container } = render(<BackgroundImage />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
  });

  it('カスタムopacityが反映される', () => {
    const { container } = render(<BackgroundImage opacity={0.5} />);
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ opacity: 0.5 });
  });

  it('デフォルトopacityは0.2', () => {
    const { container } = render(<BackgroundImage />);
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ opacity: 0.2 });
  });

  it('pointer-eventsがnone（操作不可）', () => {
    const { container } = render(<BackgroundImage />);
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ pointerEvents: 'none' });
  });
});
