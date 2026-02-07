import { test, expect } from '@playwright/test';

test.describe('名前編集', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage クリアで毎回 RulePage を表示
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('ランキングでGUEST名をクリックして変更できる', async ({ page }) => {
    await page.goto('/');

    // SelectPage: 「かんたん」を選択してスタート
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    // RulePage: チュートリアルを通過
    await expect(
      page.getByRole('heading', { name: 'あそびかた' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'ゲームへ' }).click();

    // GamePage: ゲームデータの読み込み完了を待機
    await page.waitForSelector('.MuiPaper-elevation4', { timeout: 15000 });

    // ゲーム終了まで選択肢をクリック（ResultPage に遷移するまで）
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

    // ResultPage に到達
    await expect(
      page.getByRole('button', { name: 'もう一度プレイ' })
    ).toBeVisible({ timeout: 15000 });

    // ランキングテーブルが表示されるまで待機（ライフ換金アニメーション完了後にFadeIn）
    await expect(page.getByRole('tab', { name: '全体' })).toBeVisible({
      timeout: 30000,
    });

    // 現在のユーザー名 GUEST が表示されていることを確認
    await expect(page.getByText('GUEST').first()).toBeVisible();

    // GUEST名をクリックして編集モードに入る
    // 現在のユーザーの GUEST のみが onClick ハンドラを持つ
    // 複数の GUEST エントリがある場合、クリック可能なものを見つける
    const guestTexts = page.getByText('GUEST', { exact: true });
    const guestCount = await guestTexts.count();

    for (let i = 0; i < guestCount; i++) {
      await guestTexts.nth(i).click();
      const inputVisible = await page
        .locator('.MuiInput-input')
        .isVisible()
        .catch(() => false);
      if (inputVisible) break;
    }

    // 編集用テキストフィールドが表示されていることを確認
    const textField = page.locator('.MuiInput-input');
    await expect(textField).toBeVisible();
    await expect(textField).toHaveValue('GUEST');

    // 名前をクリア・入力
    await textField.fill('E2EPlayer');

    // Enter キーで確定（PATCH API + GET rankings/overall が呼ばれる）
    await textField.press('Enter');

    // API通信完了・UI更新を待機（TextField が消えて Typography に戻る）
    await expect(textField).not.toBeVisible({ timeout: 10000 });

    // 更新後の名前が表示されていることを確認
    await expect(page.getByText('E2EPlayer').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('名前編集中にEscapeキーでキャンセルできる', async ({ page }) => {
    await page.goto('/');

    // ゲームを開始
    await page.getByRole('button', { name: 'かんたん' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();
    await expect(
      page.getByRole('heading', { name: 'あそびかた' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'ゲームへ' }).click();
    await page.waitForSelector('.MuiPaper-elevation4', { timeout: 15000 });

    // ゲーム終了まで選択肢をクリック
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

    // ランキングテーブル表示待機
    await expect(page.getByRole('tab', { name: '全体' })).toBeVisible({
      timeout: 30000,
    });

    // GUEST名をクリックして編集モードに入る
    const guestTexts = page.getByText('GUEST', { exact: true });
    const guestCount = await guestTexts.count();

    for (let i = 0; i < guestCount; i++) {
      await guestTexts.nth(i).click();
      const inputVisible = await page
        .locator('.MuiInput-input')
        .isVisible()
        .catch(() => false);
      if (inputVisible) break;
    }

    const textField = page.locator('.MuiInput-input');
    await expect(textField).toBeVisible();

    // 名前を入力
    await textField.fill('CancelTest');

    // Escape キーでキャンセル
    await textField.press('Escape');

    // テキストフィールドが消える
    await expect(textField).not.toBeVisible({ timeout: 5000 });

    // 元の名前（GUEST）が残っている
    await expect(page.getByText('GUEST').first()).toBeVisible();
  });
});
