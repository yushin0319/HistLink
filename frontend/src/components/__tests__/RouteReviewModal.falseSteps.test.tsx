import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RouteStepWithChoices } from '../../types/api';
import RouteReviewModal from '../RouteReviewModal';

const mockSteps: RouteStepWithChoices[] = [
  {
    step_no: 0,
    term: {
      id: 1,
      name: '邪馬台国',
      tier: 1,
      category: '弥生時代',
      description: '',
    },
    correct_next_id: 2,
    choices: [],
    difficulty: 'easy',
    keyword: '女王卑弥呼',
    edge_description: '邪馬台国を統治した女王',
  },
  {
    step_no: 1,
    term: {
      id: 2,
      name: '卑弥呼',
      tier: 1,
      category: '弥生時代',
      description: '',
    },
    correct_next_id: 3,
    choices: [],
    difficulty: 'normal',
    keyword: '大化の改新',
    edge_description: '律令制度が導入された',
  },
  {
    step_no: 2,
    term: {
      id: 3,
      name: '大化の改新',
      tier: 1,
      category: '飛鳥時代',
      description: '',
    },
    correct_next_id: null,
    choices: [],
    difficulty: '',
    keyword: '',
    edge_description: '',
  },
];

describe('RouteReviewModal falseSteps表示', () => {
  it('間違えたエッジのキーワードが赤色で表示される', () => {
    render(
      <RouteReviewModal
        open={true}
        onClose={vi.fn()}
        steps={mockSteps}
        falseSteps={[0]} // index 0のエッジで間違えた
      />,
    );

    // 「女王卑弥呼」キーワードが存在することを確認
    expect(screen.getByText('女王卑弥呼')).toBeInTheDocument();
  });

  it('間違えた先のtermに赤枠が表示される', () => {
    render(
      <RouteReviewModal
        open={true}
        onClose={vi.fn()}
        steps={mockSteps}
        falseSteps={[0]} // index 0のエッジで間違えた → index 1のtermに赤枠
      />,
    );

    // 卑弥呼（index 1）が表示されることを確認
    expect(screen.getByText('卑弥呼')).toBeInTheDocument();
  });

  it('3回目のミス以降はグレー表示になる', () => {
    // 5つのステップを持つデータ
    const fiveSteps: RouteStepWithChoices[] = [
      {
        step_no: 0,
        term: { id: 1, name: 'Term1', tier: 1, category: '', description: '' },
        correct_next_id: 2,
        choices: [],
        difficulty: 'easy',
        keyword: 'Keyword1',
        edge_description: '',
      },
      {
        step_no: 1,
        term: { id: 2, name: 'Term2', tier: 1, category: '', description: '' },
        correct_next_id: 3,
        choices: [],
        difficulty: 'easy',
        keyword: 'Keyword2',
        edge_description: '',
      },
      {
        step_no: 2,
        term: { id: 3, name: 'Term3', tier: 1, category: '', description: '' },
        correct_next_id: 4,
        choices: [],
        difficulty: 'easy',
        keyword: 'Keyword3',
        edge_description: '',
      },
      {
        step_no: 3,
        term: { id: 4, name: 'Term4', tier: 1, category: '', description: '' },
        correct_next_id: 5,
        choices: [],
        difficulty: 'easy',
        keyword: 'Keyword4',
        edge_description: '',
      },
      {
        step_no: 4,
        term: { id: 5, name: 'Term5', tier: 1, category: '', description: '' },
        correct_next_id: null,
        choices: [],
        difficulty: '',
        keyword: '',
        edge_description: '',
      },
    ];

    render(
      <RouteReviewModal
        open={true}
        onClose={vi.fn()}
        steps={fiveSteps}
        falseSteps={[0, 1, 2]} // 3回ミス：index 0, 1, 2
      />,
    );

    // 全てのTermが表示されることを確認
    expect(screen.getByText('Term1')).toBeInTheDocument();
    expect(screen.getByText('Term2')).toBeInTheDocument();
    expect(screen.getByText('Term3')).toBeInTheDocument();
    expect(screen.getByText('Term4')).toBeInTheDocument();
    expect(screen.getByText('Term5')).toBeInTheDocument();
  });
});
