import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDataProvider } from '../dataProvider';

// fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe('createDataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    it('ページネーション付きでリソースを取得する', async () => {
      const items = [{ id: 1, name: '邪馬台国' }];
      mockFetch.mockReturnValue(jsonResponse({ items, total: 1 }));

      const provider = createDataProvider();
      const result = await provider.getList({ resource: 'terms', pagination: { current: 2, pageSize: 5 } });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms?skip=5&limit=5');
      expect(result.data).toEqual(items);
      expect(result.total).toBe(1);
    });

    it('デフォルトページネーション（page=1, size=10）', async () => {
      mockFetch.mockReturnValue(jsonResponse({ items: [], total: 0 }));

      const provider = createDataProvider();
      await provider.getList({ resource: 'edges' });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/edges?skip=0&limit=10');
    });

    it('ソートパラメータを送信する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ items: [], total: 0 }));

      const provider = createDataProvider();
      await provider.getList({
        resource: 'terms',
        sorters: [{ field: 'name', order: 'asc' }],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('sort_by=name');
      expect(url).toContain('sort_order=asc');
    });

    it('フィルターパラメータを送信する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ items: [], total: 0 }));

      const provider = createDataProvider();
      await provider.getList({
        resource: 'terms',
        filters: [{ field: 'tier', operator: 'eq', value: 2 }],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('tier=2');
    });

    it('配列レスポンス（items/totalなし）にも対応する', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      mockFetch.mockReturnValue(jsonResponse(data));

      const provider = createDataProvider();
      const result = await provider.getList({ resource: 'terms' });

      expect(result.data).toEqual(data);
      expect(result.total).toBe(2);
    });
  });

  describe('getOne', () => {
    it('IDでリソースを取得する', async () => {
      const term = { id: 1, name: '邪馬台国' };
      mockFetch.mockReturnValue(jsonResponse(term));

      const provider = createDataProvider();
      const result = await provider.getOne({ resource: 'terms', id: 1 });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms/1');
      expect(result.data).toEqual(term);
    });
  });

  describe('create', () => {
    it('POSTでリソースを作成する', async () => {
      const newTerm = { id: 10, name: '卑弥呼', tier: 1, category: '弥生時代' };
      mockFetch.mockReturnValue(jsonResponse(newTerm));

      const provider = createDataProvider();
      const result = await provider.create({
        resource: 'terms',
        variables: { name: '卑弥呼', tier: 1, category: '弥生時代' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '卑弥呼', tier: 1, category: '弥生時代' }),
      });
      expect(result.data).toEqual(newTerm);
    });

    it('作成後にcacheUpdaterが呼ばれる（terms）', async () => {
      const newTerm = { id: 10, name: '卑弥呼' };
      mockFetch.mockReturnValue(jsonResponse(newTerm));

      const addTerm = vi.fn();
      const provider = createDataProvider({ addTerm });
      await provider.create({ resource: 'terms', variables: { name: '卑弥呼' } });

      expect(addTerm).toHaveBeenCalledWith(newTerm);
    });

    it('作成後にcacheUpdaterが呼ばれる（edges）', async () => {
      const newEdge = { id: 5, from_term_id: 1, to_term_id: 2 };
      mockFetch.mockReturnValue(jsonResponse(newEdge));

      const addEdge = vi.fn();
      const provider = createDataProvider({ addEdge });
      await provider.create({ resource: 'edges', variables: { from_term_id: 1, to_term_id: 2 } });

      expect(addEdge).toHaveBeenCalledWith(newEdge);
    });
  });

  describe('update', () => {
    it('PUTでリソースを更新する', async () => {
      const updated = { id: 1, name: '更新済み' };
      mockFetch.mockReturnValue(jsonResponse(updated));

      const provider = createDataProvider();
      const result = await provider.update({
        resource: 'terms',
        id: 1,
        variables: { name: '更新済み' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '更新済み' }),
      });
      expect(result.data).toEqual(updated);
    });

    it('更新後にcacheUpdaterが呼ばれる', async () => {
      const updated = { id: 1, name: '更新済み' };
      mockFetch.mockReturnValue(jsonResponse(updated));

      const updateTerm = vi.fn();
      const provider = createDataProvider({ updateTerm });
      await provider.update({ resource: 'terms', id: 1, variables: { name: '更新済み' } });

      expect(updateTerm).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteOne', () => {
    it('DELETEでリソースを削除する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ success: true }));

      const provider = createDataProvider();
      await provider.deleteOne({ resource: 'terms', id: 1 });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms/1', { method: 'DELETE' });
    });

    it('削除後にcacheUpdaterが呼ばれる（terms）', async () => {
      mockFetch.mockReturnValue(jsonResponse({ success: true }));

      const deleteTerm = vi.fn();
      const provider = createDataProvider({ deleteTerm });
      await provider.deleteOne({ resource: 'terms', id: 42 });

      expect(deleteTerm).toHaveBeenCalledWith(42);
    });

    it('削除後にcacheUpdaterが呼ばれる（edges）', async () => {
      mockFetch.mockReturnValue(jsonResponse({ success: true }));

      const deleteEdge = vi.fn();
      const provider = createDataProvider({ deleteEdge });
      await provider.deleteOne({ resource: 'edges', id: '7' });

      expect(deleteEdge).toHaveBeenCalledWith(7); // Number変換される
    });
  });

  describe('getMany', () => {
    it('複数IDで個別にfetchする', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ id: 1, name: 'A' }))
        .mockReturnValueOnce(jsonResponse({ id: 2, name: 'B' }));

      const provider = createDataProvider();
      const result = await provider.getMany!({ resource: 'terms', ids: [1, 2] });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
    });
  });

  describe('getApiUrl', () => {
    it('/api/adminを返す', () => {
      const provider = createDataProvider();
      expect(provider.getApiUrl()).toBe('/api/admin');
    });
  });

  describe('custom', () => {
    it('カスタムGETリクエストを送信する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ ok: true }));

      const provider = createDataProvider();
      const result = await provider.custom!({ url: '/stats', method: 'get' });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/stats', {
        method: 'get',
        headers: undefined,
        body: undefined,
      });
      expect(result.data).toEqual({ ok: true });
    });

    it('カスタムPOSTリクエストをpayload付きで送信する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ created: true }));

      const provider = createDataProvider();
      await provider.custom!({ url: '/import', method: 'post', payload: { data: [1, 2] } });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/import', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [1, 2] }),
      });
    });
  });
});
