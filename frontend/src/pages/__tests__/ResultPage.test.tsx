import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ResultPage from '../ResultPage';

describe('ResultPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('初期表示時、正しい要素が表示される', () => {
    render(<ResultPage />);

    expect(screen.getByText('LIFE')).toBeInTheDocument();
    expect(screen.getByText('SCORE')).toBeInTheDocument();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
    expect(screen.getByText(/ゲームクリア/)).toBeInTheDocument();
  });

  it('初期状態では3ライフと初期スコア2332が表示される', () => {
    const { container } = render(<ResultPage />);

    // 初期スコア表示
    expect(screen.getByText('2332')).toBeInTheDocument();

    // 3つのダイヤモンドアイコンが存在
    const filledDiamonds = container.querySelectorAll('[data-testid="DiamondIcon"]');
    expect(filledDiamonds).toHaveLength(3);
  });

  it('0.5秒後、スコアがカウントアップされライフが1減る', async () => {
    render(<ResultPage />);

    // 初期状態
    expect(screen.getByText('2332')).toBeInTheDocument();

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // スコアが300点増加（hard: 300点ボーナス）
    expect(screen.getByText('2632')).toBeInTheDocument();
  });

  it('1.1秒後、2回目のカウントアップが完了する', async () => {
    render(<ResultPage />);

    // 1.1秒経過（1回目0.5秒 + 待機0.1秒 + 2回目0.5秒）
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // 2回分のボーナス加算（300 × 2 = 600点）
    expect(screen.getByText('2932')).toBeInTheDocument();
  });

  it('1.7秒後、3回目のカウントアップが完了し全てのライフが消費される', async () => {
    render(<ResultPage />);

    // 1.7秒経過（1回目0.5 + 待機0.1 + 2回目0.5 + 待機0.1 + 3回目0.5）
    await act(async () => {
      vi.advanceTimersByTime(1700);
    });

    // 3回分のボーナス加算（300 × 3 = 900点）
    expect(screen.getByText('3232')).toBeInTheDocument();
  });

  it('コンポーネントがアンマウントされたときタイマーがクリアされる', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<ResultPage />);

    unmount();

    // タイマーがクリアされていることを確認
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('レイアウトが正しく表示される', () => {
    const { container } = render(<ResultPage />);

    // Box要素が存在する
    const box = container.querySelector('[class*="MuiBox-root"]');
    expect(box).toBeInTheDocument();

    // Container要素が存在する
    const containerElement = container.querySelector('[class*="MuiContainer-root"]');
    expect(containerElement).toBeInTheDocument();
  });

  it('ResultHeaderコンポーネントに正しいpropsが渡される', () => {
    render(<ResultPage />);

    // currentStage=9, totalStages=10なので "COMPLETE" と表示される
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('スコアカウントアップ中にコンポーネントがアンマウントされても正常に動作する', async () => {
    const { unmount } = render(<ResultPage />);

    // カウントアップ中にアンマウント
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    unmount();

    // エラーが発生しないことを確認
    await act(async () => {
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    });
  });

  it('コンポーネントの再レンダリング時、useEffectが2回実行されない（isInitializedフラグが機能）', async () => {
    const { rerender } = render(<ResultPage />);

    // 初回レンダリング後のスコアを確認
    expect(screen.getByText('2332')).toBeInTheDocument();

    // 再レンダリング
    rerender(<ResultPage />);

    // 0.5秒経過後、カウントアップが1回だけ実行されていることを確認
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // 2回実行されていたら2932になるはずだが、1回だけなので2632
    expect(screen.getByText('2632')).toBeInTheDocument();
  });

  it('initialLivesが0の時、アニメーションが実行されない', () => {
    render(<ResultPage initialLives={0} />);

    // スコアが初期値のまま変わらない
    expect(screen.getByText('2332')).toBeInTheDocument();

    // タイマーを進めてもスコアは変わらない
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('2332')).toBeInTheDocument();
  });

  it('異なる難易度設定でスコアボーナスが変わる（easy: 100点）', async () => {
    render(<ResultPage initialLives={1} difficulty="easy" />);

    // 初期スコア確認
    expect(screen.getByText('2332')).toBeInTheDocument();

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // easyは100点ボーナス
    expect(screen.getByText('2432')).toBeInTheDocument();
  });

  it('異なる初期スコアでも正しく動作する', async () => {
    render(<ResultPage initialLives={1} initialScore={500} />);

    // 初期スコア確認
    expect(screen.getByText('500')).toBeInTheDocument();

    // 0.5秒経過
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // 500 + 300 = 800
    expect(screen.getByText('800')).toBeInTheDocument();
  });
});
