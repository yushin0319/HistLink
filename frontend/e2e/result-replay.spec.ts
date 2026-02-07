import { test, expect } from '@playwright/test';

test.describe('結果画面操作（周回テスト）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('結果画面→もう一度プレイ→SelectPage→2周目開始', async ({ page }) => {
    // --- 1周目: ゲーム開始してゲームオーバーにする ---
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/games/start') && resp.status() === 200,
    );
    await page.getByRole('button', { name: 'ゲームへ' }).click();

    const response = await responsePromise;
    const gameData = await response.json();
    const steps: {
      term: { name: string };
      correct_next_id: number | null;
      choices: { term_id: number; name: string }[];
    }[] = gameData.steps;

    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });

    // 3回不正解でゲームオーバー
    for (let i = 0; i < 3; i++) {
      const currentStep = steps[i];
      const wrongChoice = currentStep.choices.find(
        (c) => c.term_id !== currentStep.correct_next_id,
      );
      if (!wrongChoice) throw new Error(`ステップ ${i} で不正解の選択肢が見つかりません`);

      await page.getByRole('heading', { level: 5, name: wrongChoice.name }).click();

      if (i < 2) {
        const nextTermName = steps[i + 1].term.name;
        await expect(
          page.getByRole('heading', { level: 3, name: nextTermName }),
        ).toBeVisible({ timeout: 5000 });
      }
    }

    // --- 結果画面が表示される ---
    const retryButton = page.getByRole('button', { name: 'もう一度プレイ' });
    await expect(retryButton).toBeVisible({ timeout: 10000 });

    // 「もう一度プレイ」をクリック
    await retryButton.click();

    // --- SelectPage に戻ることを確認 ---
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'スタート' })).toBeVisible();

    // --- 2周目: 再度ゲームを開始 ---
    await page.getByRole('button', { name: 'かんたん' }).click();

    // 2周目の API レスポンスを待つ準備
    const response2Promise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/games/start') && resp.status() === 200,
    );

    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面はスキップ（localStorage に tutorial_seen 設定済み）
    // GamePage に直接遷移
    await response2Promise;
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('STAGE')).toBeVisible();
  });
});
