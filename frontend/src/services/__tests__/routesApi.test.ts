import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { fetchRoutes, fetchRouteSteps } from '../routesApi';
import { apiClient } from '../api';

describe('routesApi', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('fetchRoutes', () => {
    it('GET /routes が成功したらルート一覧を返す', async () => {
      const mockData = {
        routes: [
          {
            id: 1,
            start_term_id: 1,
            length: 10,
            difficulty: 'standard',
          },
        ],
        total: 1,
      };

      mock.onGet('/routes').reply(200, mockData);

      const result = await fetchRoutes();

      expect(result).toEqual(mockData);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].id).toBe(1);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onGet('/routes').reply(500, { error: 'Server Error' });

      await expect(fetchRoutes()).rejects.toThrow();
    });

    it('ネットワークエラー時はエラーをthrowする', async () => {
      mock.onGet('/routes').networkError();

      await expect(fetchRoutes()).rejects.toThrow();
    });
  });

  describe('fetchRouteSteps', () => {
    it('GET /routes/:id/steps が成功したらステップ一覧を返す', async () => {
      const mockData = {
        route_id: 1,
        steps: [
          {
            step_no: 0,
            term: {
              id: 1,
              name: 'ペリー来航',
              tier: 1,
              category: '近代',
              description: '1853年、アメリカのペリー提督が浦賀に来航',
            },
          },
        ],
        total_steps: 1,
      };

      mock.onGet('/routes/1/steps').reply(200, mockData);

      const result = await fetchRouteSteps(1);

      expect(result).toEqual(mockData);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].term.name).toBe('ペリー来航');
    });

    it('ルートIDが指定されている', async () => {
      const mockData = {
        route_id: 999,
        steps: [],
        total_steps: 0,
      };

      mock.onGet('/routes/999/steps').reply(200, mockData);

      const result = await fetchRouteSteps(999);

      expect(result.route_id).toBe(999);
    });

    it('APIエラー時はエラーをthrowする', async () => {
      mock.onGet('/routes/1/steps').reply(404, { error: 'Not Found' });

      await expect(fetchRouteSteps(1)).rejects.toThrow();
    });
  });
});
