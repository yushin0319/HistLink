import { test, expect } from '@playwright/test';

test.describe('正解パスフロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('正解選択→ステージ進行→スコア加算', async ({ page }) => {
    // ゲームを開始（SelectPage → RulePage → GamePage）
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();

    // API レスポンスをキャプチャ
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

    // ゲーム画面のロード完了を待つ
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });

    // 正解を3回選択してステージ進行・スコア加算を確認
    let previousScore = 0;

    for (let i = 0; i < 3; i++) {
      const currentStep = steps[i];
      const correctNextId = currentStep.correct_next_id;

      // 正解の選択肢を特定
      const correctChoice = currentStep.choices.find((c) => c.term_id === correctNextId);
      if (!correctChoice) throw new Error(`ステップ ${i} で正解の選択肢が見つかりません`);

      // 正解の選択肢をクリック
      await page.getByRole('heading', { level: 5, name: correctChoice.name }).click();

      // STAGE表示が進むまで待つ（フィードバック500ms後に遷移）
      const expectedStageNum = i + 2;
      await expect(
        page.locator('text=STAGE').locator('..').locator('h4').first(),
      ).toContainText(String(expectedStageNum), { timeout: 5000 });

      // スコアが加算されたことを確認（前回より増加）
      const scoreText = await page.locator('text=SCORE').locator('..').locator('h4').textContent();
      const currentScore = parseInt(scoreText ?? '0', 10);
      expect(currentScore).toBeGreaterThan(previousScore);
      previousScore = currentScore;
    }
  });
});
