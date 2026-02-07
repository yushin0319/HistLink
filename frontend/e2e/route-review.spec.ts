import { test, expect } from '@playwright/test';

test.describe('ルートレビューモーダル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('結果画面→ルートを見る→モーダル表示・閉じる', async ({ page }) => {
    // ゲーム開始してゲームオーバーにする
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
      keyword: string;
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

    // --- 結果画面で「ルートを見る」ボタンを確認 ---
    const routeButton = page.getByRole('button', { name: 'ルートを見る' });
    await expect(routeButton).toBeVisible({ timeout: 10000 });

    // 「ルートを見る」をクリック
    await routeButton.click();

    // --- RouteReviewModal が表示される ---
    const modal = page.locator('.MuiModal-root');
    await expect(modal).toBeVisible();

    // モーダル内にルート情報が表示されている（最初の用語名を確認）
    const firstTermName = steps[0].term.name;
    await expect(modal.getByText(firstTermName)).toBeVisible();

    // モーダルを閉じる（閉じるボタンをクリック）
    await modal.getByRole('button').click();

    // モーダルが閉じたことを確認
    await expect(modal).not.toBeVisible();
  });
});
