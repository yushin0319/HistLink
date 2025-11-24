import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameHeader from '../GameHeader';

describe('GameHeader', () => {
  it('全ての情報が正しく表示される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText('LIFE')).toBeInTheDocument();
    expect(screen.getByText('SCORE')).toBeInTheDocument();
    expect(screen.getByText('STAGE')).toBeInTheDocument();
    expect(screen.getByText('TIMER')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('タイマーが30以下の時は赤色で表示される', () => {
    const { rerender } = render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={30} />
    );

    const timerText = screen.getByText('3.0');
    expect(timerText).toHaveStyle({ color: 'rgb(211, 47, 47)' }); // error.main color

    rerender(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={31} />
    );

    const normalTimerText = screen.getByText('3.1');
    expect(normalTimerText).not.toHaveStyle({ color: 'rgb(211, 47, 47)' });
  });

  it('currentStageは0-indexedなので表示は+1される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={0} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText(/1 \/ 10/)).toBeInTheDocument();
  });

  it('タイマーは小数点1桁で表示される', () => {
    render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={100} />
    );

    expect(screen.getByText('10.0')).toBeInTheDocument();
  });

  it('ライフが0の時も正しく表示される（全てのダイヤがアウトライン表示）', () => {
    const { container } = render(
      <GameHeader lives={0} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(outlinedDiamonds).toHaveLength(3);
  });

  it('スコアが0の時も正しく表示される', () => {
    render(
      <GameHeader lives={3} score={0} currentStage={5} totalStages={10} remainingTime={75} />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('ライフアイコンが3つ表示される', () => {
    const { container } = render(
      <GameHeader lives={3} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    expect(filledDiamonds).toHaveLength(3);
  });

  it('ライフが2の時、塗りつぶしダイヤが2つ、アウトラインダイヤが1つ表示される', () => {
    const { container } = render(
      <GameHeader lives={2} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(filledDiamonds).toHaveLength(2);
    expect(outlinedDiamonds).toHaveLength(1);
  });

  it('ライフが1の時、塗りつぶしダイヤが1つ、アウトラインダイヤが2つ表示される', () => {
    const { container } = render(
      <GameHeader lives={1} score={500} currentStage={5} totalStages={10} remainingTime={75} />
    );

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(filledDiamonds).toHaveLength(1);
    expect(outlinedDiamonds).toHaveLength(2);
  });
});
