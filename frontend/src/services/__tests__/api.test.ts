import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../api';

describe('api', () => {
  let mock: MockAdapter;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
    consoleErrorSpy.mockRestore();
  });

  describe('interceptor error handling', () => {
    it('レスポンスエラー時にconsole.errorが呼ばれる', async () => {
      mock.onGet('/test').reply(500, { error: 'Server Error' });

      await expect(apiClient.get('/test')).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API Error:',
        { error: 'Server Error' }
      );
    });

    it('ネットワークエラー時にconsole.errorが呼ばれる', async () => {
      // リクエストが送信されたがレスポンスがない場合をシミュレート
      mock.onGet('/test').reply(() => {
        const error: any = new Error('Network Error');
        error.request = { /* mock request object */ };
        return Promise.reject(error);
      });

      await expect(apiClient.get('/test')).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Network Error:',
        expect.anything()
      );
    });

    it('リクエスト設定エラー時にconsole.errorが呼ばれる', async () => {
      // タイムアウトを0msに設定してエラーを発生させる
      mock.onGet('/test').timeout();

      await expect(apiClient.get('/test')).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Request Error:',
        expect.any(String)
      );
    });
  });

  describe('apiClient configuration', () => {
    it('baseURLが正しく設定されている', () => {
      expect(apiClient.defaults.baseURL).toMatch(/\/api\/v1$/);
    });

    it('Content-Typeヘッダーが設定されている', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('タイムアウトが設定されている', () => {
      expect(apiClient.defaults.timeout).toBe(10000);
    });
  });
});
