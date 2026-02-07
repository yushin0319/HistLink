import { test, expect } from '@playwright/test';

test.describe('ゲーム開始フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('難易度選択→ルール画面→ゲーム画面の遷移', async ({ page }) => {
    // トップページ（SelectPage）が表示される
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();

    // 難易度「かんたん」を選択
    await page.getByRole('button', { name: 'かんたん' }).click();

    // スタートボタンをクリック
    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面に遷移する
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ゲームへ' })).toBeVisible();

    // ゲーム開始ボタンをクリック
    await page.getByRole('button', { name: 'ゲームへ' }).click();

    // ゲーム画面に遷移する（GameHeader の要素が表示される）
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('STAGE')).toBeVisible();
    await expect(page.getByText('SCORE')).toBeVisible();
    await expect(page.getByText('TIMER')).toBeVisible();

    // 選択肢（ChoiceCard）が4つ表示される
    const choices = page.getByRole('heading', { level: 5 });
    await expect(choices).toHaveCount(4);
  });
});
