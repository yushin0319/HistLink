import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultHeader from '../ResultHeader';

describe('ResultHeader', () => {
  it('全ての情報が正しく表示される', () => {
    render(<ResultHeader lives={2} score={850} currentStage={8} totalStages={10} />);

    expect(screen.getByText('LIFE')).toBeInTheDocument();
    expect(screen.getByText('SCORE')).toBeInTheDocument();
    expect(screen.getByText('STAGE')).toBeInTheDocument();
    expect(screen.getByText('850')).toBeInTheDocument();
    expect(screen.getByText(/9 \/ 10/)).toBeInTheDocument();
  });

  it('currentStageは0-indexedなので表示は+1される', () => {
    render(<ResultHeader lives={3} score={500} currentStage={0} totalStages={10} />);

    expect(screen.getByText(/1 \/ 10/)).toBeInTheDocument();
  });

  it('ライフが0の時も正しく表示される（全てのダイヤがアウトライン表示）', () => {
    const { container } = render(
      <ResultHeader lives={0} score={500} currentStage={5} totalStages={10} />
    );

    // 両方のアイコンが存在するが、opacityで制御されている
    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(filledDiamonds).toHaveLength(3);
    expect(outlinedDiamonds).toHaveLength(3);
  });

  it('スコアが0の時も正しく表示される', () => {
    render(<ResultHeader lives={3} score={0} currentStage={5} totalStages={10} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('ライフアイコンが常に3セット（塗りつぶし+アウトライン）表示される', () => {
    const { container } = render(
      <ResultHeader lives={3} score={500} currentStage={5} totalStages={10} />
    );

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(filledDiamonds).toHaveLength(3);
    expect(outlinedDiamonds).toHaveLength(3);
  });

  it('ライフが2の時も両方のアイコンが3つずつ表示される（opacityで制御）', () => {
    const { container } = render(
      <ResultHeader lives={2} score={500} currentStage={5} totalStages={10} />
    );

    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    const outlinedDiamonds = container.querySelectorAll('[data-testid="DiamondOutlinedIcon"]');
    expect(filledDiamonds).toHaveLength(3);
    expect(outlinedDiamonds).toHaveLength(3);
  });

  it('ゲームクリア時（currentStage + 1 === totalStages）は"COMPLETE"と表示される', () => {
    render(<ResultHeader lives={2} score={1500} currentStage={9} totalStages={10} />);

    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('ゲームオーバー時（途中でライフ0）の表示', () => {
    render(<ResultHeader lives={0} score={300} currentStage={3} totalStages={10} />);

    expect(screen.getByText(/4 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });
});
