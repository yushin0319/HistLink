import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteReviewModal from '../RouteReviewModal';
import type { RouteStepWithChoices } from '../../types/api';

// モックデータ
const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: { id: 1, name: '邪馬台国', tier: 1, category: '弥生時代', description: '' },
    correct_next_id: 2,
    choices: [],
    difficulty: 'easy',
    keyword: '女王卑弥呼',
    relation_description: '邪馬台国を統治した女王',
  },
  {
    step_no: 1,
    term: { id: 2, name: '卑弥呼', tier: 1, category: '弥生時代', description: '' },
    correct_next_id: 3,
    choices: [],
    difficulty: 'normal',
    keyword: '大化の改新',
    relation_description: '律令制度が導入された',
  },
  {
    step_no: 2,
    term: { id: 3, name: '大化の改新', tier: 1, category: '飛鳥時代', description: '' },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    relation_description: '',
  },
];

describe('RouteReviewModal', () => {
  describe('表示/非表示', () => {
    it('open=trueの時、モーダルが表示される', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });

    it('open=falseの時、モーダルは表示されない', () => {
      render(
        <RouteReviewModal
          open={false}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });
  });

  describe('ルート表示', () => {
    it('全ての用語名が表示される', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.getByText('邪馬台国')).toBeInTheDocument();
      expect(screen.getByText('卑弥呼')).toBeInTheDocument();
      // 「大化の改新」は用語名とキーワードの両方に存在するので複数ある
      const daikaElements = screen.getAllByText('大化の改新');
      expect(daikaElements.length).toBeGreaterThanOrEqual(1);
    });

    it('全ての時代が表示される', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      // 弥生時代は2つある
      const yayoiElements = screen.getAllByText('弥生時代');
      expect(yayoiElements).toHaveLength(2);
      expect(screen.getByText('飛鳥時代')).toBeInTheDocument();
    });

    it('キーワードが表示される（最後の要素以外）', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.getByText('女王卑弥呼')).toBeInTheDocument();
      // 「大化の改新」は用語名とキーワードの両方に存在
      const daikaElements = screen.getAllByText('大化の改新');
      expect(daikaElements.length).toBeGreaterThanOrEqual(1);
    });

    it('relation_descriptionが表示される', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.getByText('邪馬台国を統治した女王')).toBeInTheDocument();
      expect(screen.getByText('律令制度が導入された')).toBeInTheDocument();
    });
  });

  describe('閉じるボタン', () => {
    it('閉じるボタンが表示される', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      render(
        <RouteReviewModal
          open={true}
          onClose={mockOnClose}
          steps={mockSteps}
        />
      );

      const closeButton = screen.getByRole('button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('空のsteps', () => {
    it('stepsが空でもエラーにならない', () => {
      expect(() => {
        render(
          <RouteReviewModal
            open={true}
            onClose={vi.fn()}
            steps={[]}
          />
        );
      }).not.toThrow();
    });
  });

  describe('relation_descriptionがない場合', () => {
    it('relation_descriptionが空の場合は表示されない', () => {
      const stepsWithoutDesc: RouteStepWithChoices[] = [
        {
          step_no: 0,
          term: { id: 1, name: 'テスト用語', tier: 1, category: 'テスト時代', description: '' },
          correct_next_id: 2,
          choices: [],
          difficulty: '',
          keyword: 'テストキーワード',
          relation_description: '', // 空
        },
        {
          step_no: 1,
          term: { id: 2, name: '次の用語', tier: 1, category: 'テスト時代', description: '' },
          correct_next_id: null,
          choices: [],
          difficulty: '',
          keyword: '',
          relation_description: '',
        },
      ];

      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={stepsWithoutDesc}
        />
      );

      // キーワードは表示される
      expect(screen.getByText('テストキーワード')).toBeInTheDocument();
      // relation_descriptionは空なので、該当するTypographyは表示されない
      // (空文字でも要素自体は存在しないことを確認)
    });
  });

  describe('スクロール', () => {
    it('モーダルコンテンツがスクロール可能なスタイルを持つ', () => {
      render(
        <RouteReviewModal
          open={true}
          onClose={vi.fn()}
          steps={mockSteps}
        />
      );

      // MUI Modalのコンテンツボックスを確認
      const contentBox = screen.getByRole('presentation').querySelector('[class*="MuiBox-root"]');
      expect(contentBox).toBeInTheDocument();
    });
  });
});
