import { test, expect } from '@playwright/test';

test.describe('ランキング表示', () => {
  test.beforeEach(async ({ page }) => {
    // チュートリアル済みフラグをセットしてスキップ
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('histlink_tutorial_seen', 'true');
    });
  });

  test('ゲーム終了後にランキングテーブルが表示される', async ({ page }) => {
    await page.goto('/');

    // SelectPage: 「かんたん」を選択してスタート
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // GamePage: ゲームデータの読み込み完了を待機
    await page.waitForSelector('.MuiPaper-elevation4', { timeout: 15000 });

    // ゲームが終了するまで選択肢をクリック（ResultPageに遷移するまで）
    for (let i = 0; i < 60; i++) {
      const isResult = await page
        .getByRole('button', { name: 'もう一度プレイ' })
        .isVisible()
        .catch(() => false);
      if (isResult) break;

      const choices = page.locator('.MuiPaper-elevation4');
      const count = await choices.count();
      if (count > 0) {
        await choices.first().click();
        // フィードバックフェーズ(0.5秒) + 遷移マージン
        await page.waitForTimeout(700);
      } else {
        await page.waitForTimeout(500);
      }
    }

    // ResultPage に到達していることを確認
    await expect(
      page.getByRole('button', { name: 'もう一度プレイ' })
    ).toBeVisible({ timeout: 15000 });

    // ランキングテーブルが表示されるまで待機（ライフ換金アニメーション完了後にFadeIn）
    await expect(page.getByRole('tab', { name: '全体' })).toBeVisible({
      timeout: 30000,
    });

    // --- ランキングテーブルの検証 ---

    // タブが2つ表示される: "X問" タブと "全体" タブ
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toBeVisible();
    await expect(tabs.first()).toContainText(/\d+問/);
    await expect(page.getByRole('tab', { name: '全体' })).toBeVisible();

    // 「ルートを見る」ボタンが表示される
    await expect(
      page.getByRole('button', { name: 'ルートを見る' })
    ).toBeVisible();

    // ランキングデータが表示されている（少なくとも1つのランキング行が存在）
    // ランキング行にはユーザー名が含まれる（デフォルト: GUEST）
    // 複数のGUESTエントリが存在する場合があるため .first() を使用
    await expect(page.getByText('GUEST').first()).toBeVisible();
  });

  test('全体タブに切り替えるとランキングが表示される', async ({ page }) => {
    await page.goto('/');

    // ゲームを開始してプレイ
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();
    await page.waitForSelector('.MuiPaper-elevation4', { timeout: 15000 });

    for (let i = 0; i < 60; i++) {
      const isResult = await page
        .getByRole('button', { name: 'もう一度プレイ' })
        .isVisible()
        .catch(() => false);
      if (isResult) break;

      const choices = page.locator('.MuiPaper-elevation4');
      const count = await choices.count();
      if (count > 0) {
        await choices.first().click();
        await page.waitForTimeout(700);
      } else {
        await page.waitForTimeout(500);
      }
    }

    await expect(
      page.getByRole('button', { name: 'もう一度プレイ' })
    ).toBeVisible({ timeout: 15000 });

    // ランキングテーブルの表示を待機
    await expect(page.getByRole('tab', { name: '全体' })).toBeVisible({
      timeout: 30000,
    });

    // デフォルトは「X問」タブが選択されている
    const stageTab = page.getByRole('tab').first();
    await expect(stageTab).toHaveAttribute('aria-selected', 'true');

    // 「全体」タブをクリック
    await page.getByRole('tab', { name: '全体' }).click();

    // 「全体」タブが選択状態になる
    await expect(page.getByRole('tab', { name: '全体' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // 全体ランキングにもデータが表示される（GUEST が存在）
    await expect(page.getByText('GUEST').first()).toBeVisible();
  });
});
