import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

function err(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

describe('api', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('URLSearchParamsを使ってリソースを取得する', async () => {
      const items = [{ id: 1, name: '邪馬台国' }];
      mockFetch.mockReturnValue(ok({ items, total: 1 }));

      const params = new URLSearchParams({ skip: '5', limit: '5' });
      const result = await api.list('terms', params);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms?skip=5&limit=5',
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result.data).toEqual(items);
      expect(result.total).toBe(1);
    });

    it('パラメータなしで取得する', async () => {
      mockFetch.mockReturnValue(ok({ items: [], total: 0 }));

      await api.list('terms');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms',
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
    });

    it('配列レスポンスを正規化する', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      mockFetch.mockReturnValue(ok(data));

      const result = await api.list('terms');

      expect(result.data).toEqual(data);
      expect(result.total).toBe(2);
    });

    it('エラー時にthrowする', async () => {
      mockFetch.mockReturnValue(err(500));
      await expect(api.list('terms')).rejects.toThrow('HTTP 500');
    });
  });

  describe('get', () => {
    it('IDでリソースを取得する', async () => {
      const term = { id: 1, name: '邪馬台国' };
      mockFetch.mockReturnValue(ok(term));

      const result = await api.get('terms', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms/1',
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(term);
    });

    it('エラー時にthrowする', async () => {
      mockFetch.mockReturnValue(err(404));
      await expect(api.get('terms', 999)).rejects.toThrow('HTTP 404');
    });
  });

  describe('create', () => {
    it('POSTでリソースを作成する', async () => {
      const newTerm = { id: 10, name: '卑弥呼' };
      mockFetch.mockReturnValue(ok(newTerm));

      const result = await api.create('terms', { name: '卑弥呼' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify({ name: '卑弥呼' }),
        }),
      );
      expect(result).toEqual(newTerm);
    });

    it('エラー時にthrowする', async () => {
      mockFetch.mockReturnValue(err(400));
      await expect(api.create('terms', {})).rejects.toThrow('HTTP 400');
    });
  });

  describe('update', () => {
    it('PUTでリソースを更新する', async () => {
      const updated = { id: 1, name: '更新済み' };
      mockFetch.mockReturnValue(ok(updated));

      const result = await api.update('terms', 1, { name: '更新済み' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.any(Headers),
          body: JSON.stringify({ name: '更新済み' }),
        }),
      );
      expect(result).toEqual(updated);
    });

    it('エラー時にthrowする', async () => {
      mockFetch.mockReturnValue(err(400));
      await expect(api.update('terms', 1, {})).rejects.toThrow('HTTP 400');
    });
  });

  describe('delete', () => {
    it('DELETEでリソースを削除する', async () => {
      mockFetch.mockReturnValue(ok({ success: true }));

      await api.delete('terms', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/terms/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Headers),
        }),
      );
    });

    it('エラー時にthrowする', async () => {
      mockFetch.mockReturnValue(err(404));
      await expect(api.delete('terms', 999)).rejects.toThrow('HTTP 404');
    });
  });
});
