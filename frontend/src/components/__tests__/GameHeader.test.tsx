import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameHeader from '../GameHeader';

describe('GameHeader', () => {
  it('全ての情報が正しく表示される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText(/ライフ: 3/)).toBeInTheDocument();
    expect(screen.getByText(/スコア: 500/)).toBeInTheDocument();
    expect(screen.getByText(/ステージ: 6 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText(/7\.5秒/)).toBeInTheDocument();
  });

  it('タイマーが30以下の時は赤色で表示される', () => {
    const { rerender } = render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={30} />
    );

    const timerText = screen.getByText(/3\.0秒/);
    expect(timerText).toHaveStyle({ color: 'rgb(211, 47, 47)' }); // error.main color

    rerender(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={31} />
    );

    const normalTimerText = screen.getByText(/3\.1秒/);
    expect(normalTimerText).not.toHaveStyle({ color: 'rgb(211, 47, 47)' });
  });

  it('currentStageは0-indexedなので表示は+1される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={0} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText(/ステージ: 1 \/ 10/)).toBeInTheDocument();
  });

  it('タイマーは小数点1桁で表示される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={100} />
    );

    expect(screen.getByText(/10\.0秒/)).toBeInTheDocument();
  });

  it('ライフが0の時も正しく表示される', () => {
    render(
      <GameHeader lives={0} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText(/ライフ: 0/)).toBeInTheDocument();
  });

  it('スコアが0の時も正しく表示される', () => {
    render(
      <GameHeader lives={3} score={0} currentStage={5} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText(/スコア: 0/)).toBeInTheDocument();
  });

  it('アイコンが4つ表示される', () => {
    const { container } = render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(4);
  });
});
