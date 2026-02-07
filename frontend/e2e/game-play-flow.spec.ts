import { test, expect } from '@playwright/test';

test.describe('ゲームプレイフロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('histlink_tutorial_seen'));
  });

  test('選択肢クリック→次の問題→結果画面への遷移', async ({ page }) => {
    // ゲームを開始（SelectPage → RulePage → GamePage）
    await expect(page.getByRole('heading', { name: 'HistLink' })).toBeVisible();
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // ルール画面
    await expect(page.getByRole('heading', { name: 'あそびかた' })).toBeVisible();

    // API レスポンスをキャプチャする準備（ゲームへクリック後に API が呼ばれる）
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/games/start') && resp.status() === 200,
    );

    await page.getByRole('button', { name: 'ゲームへ' }).click();

    // ゲームデータを取得
    const response = await responsePromise;
    const gameData = await response.json();
    const steps: {
      term: { name: string };
      correct_next_id: number | null;
      choices: { term_id: number; name: string }[];
    }[] = gameData.steps;

    // ゲーム画面のロード完了を待つ
    await expect(page.getByText('LIFE')).toBeVisible({ timeout: 15000 });

    // 3回不正解してゲームオーバーにする（ライフ 3 → 0）
    for (let i = 0; i < 3; i++) {
      const currentStep = steps[i];
      const correctNextId = currentStep.correct_next_id;

      // 不正解の選択肢を特定
      const wrongChoice = currentStep.choices.find((c) => c.term_id !== correctNextId);
      if (!wrongChoice) throw new Error(`ステップ ${i} で不正解の選択肢が見つかりません`);

      // 選択肢をクリック
      await page.getByRole('heading', { level: 5, name: wrongChoice.name }).click();

      if (i < 2) {
        // 次の問題が表示されることを確認（フィードバック 500ms 後に遷移）
        const nextTermName = steps[i + 1].term.name;
        await expect(
          page.getByRole('heading', { level: 3, name: nextTermName }),
        ).toBeVisible({ timeout: 5000 });
      }
    }

    // 結果画面が表示されることを確認
    await expect(
      page.getByRole('button', { name: 'もう一度プレイ' }),
    ).toBeVisible({ timeout: 10000 });
  });
});
