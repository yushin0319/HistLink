import { test, expect } from '@playwright/test';

test.describe('難易度バリエーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('normal難易度でゲーム開始→GamePageに遷移', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();

    // ふつう（normal）を選択
    await page.getByRole('button', { name: 'ふつう' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();
    await page.getByRole('button', { name: 'ゲームへ' }).click();

    // ゲーム画面のヘッダー要素が表示される
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('STAGE')).toBeVisible();
    await expect(page.getByText('SCORE')).toBeVisible();
    await expect(page.getByText('TIMER')).toBeVisible();

    // 選択肢が4つ表示される
    const choices = page.getByRole('heading', { level: 5 });
    await expect(choices).toHaveCount(4);
  });

  test('hard難易度でゲーム開始→GamePageに遷移', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();

    // 難しい（hard）を選択
    await page.getByRole('button', { name: '難しい' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();
    await page.getByRole('button', { name: 'ゲームへ' }).click();

    // ゲーム画面のヘッダー要素が表示される
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('STAGE')).toBeVisible();
    await expect(page.getByText('SCORE')).toBeVisible();
    await expect(page.getByText('TIMER')).toBeVisible();

    // 選択肢が4つ表示される
    const choices = page.getByRole('heading', { level: 5 });
    await expect(choices).toHaveCount(4);
  });
});
