import { beforeEach, describe, expect, it, vi } from 'vitest';
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

function errorResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: 'Error' }),
  });
}

describe('createDataProvider - エラー・その他操作', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteOne', () => {
    it('DELETEでリソースを削除する', async () => {
      mockFetch.mockReturnValue(jsonResponse({ success: true }));

      const provider = createDataProvider();
      await provider.deleteOne({ resource: 'terms', id: 1 });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/terms/1', {
        method: 'DELETE',
      });
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
    it('複数IDで個別にfetchし結果を統合する', async () => {
      mockFetch
        .mockReturnValueOnce(jsonResponse({ id: 1, name: 'A' }))
        .mockReturnValueOnce(jsonResponse({ id: 2, name: 'B' }));

      const provider = createDataProvider();
      const result = await provider.getMany!({
        resource: 'terms',
        ids: [1, 2],
      });

      // 各IDに対応するデータが返ることを確認（個別fetchの結果統合）
      expect(result.data).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });
  });

  describe('getApiUrl', () => {
    it('/api/adminを返す', () => {
      const provider = createDataProvider();
      expect(provider.getApiUrl()).toBe('/api/admin');
    });
  });

  describe('response.ok チェック', () => {
    it('getList: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(500));
      const provider = createDataProvider();
      await expect(provider.getList({ resource: 'terms' })).rejects.toThrow();
    });

    it('getOne: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(404));
      const provider = createDataProvider();
      await expect(
        provider.getOne({ resource: 'terms', id: 999 }),
      ).rejects.toThrow();
    });

    it('create: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(400));
      const provider = createDataProvider();
      await expect(
        provider.create({ resource: 'terms', variables: {} }),
      ).rejects.toThrow();
    });

    it('update: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(400));
      const provider = createDataProvider();
      await expect(
        provider.update({ resource: 'terms', id: 1, variables: {} }),
      ).rejects.toThrow();
    });

    it('deleteOne: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(404));
      const provider = createDataProvider();
      await expect(
        provider.deleteOne({ resource: 'terms', id: 999 }),
      ).rejects.toThrow();
    });

    it('custom: !response.ok でエラーをthrowする', async () => {
      mockFetch.mockReturnValue(errorResponse(500));
      const provider = createDataProvider();
      await expect(
        provider.custom!({ url: '/stats', method: 'get' }),
      ).rejects.toThrow();
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
      await provider.custom!({
        url: '/import',
        method: 'post',
        payload: { data: [1, 2] },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/import', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [1, 2] }),
      });
    });
  });
});
