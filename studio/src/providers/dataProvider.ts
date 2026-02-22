import type { DataProvider } from '@refinedev/core';
import type { Term, Edge } from '../contexts/DataContext';

const API_URL = '/api/admin';

export interface CacheUpdaters {
  addTerm?: (term: Term) => void;
  updateTerm?: (term: Term) => void;
  deleteTerm?: (id: number) => void;
  addEdge?: (edge: Edge) => void;
  updateEdge?: (edge: Edge) => void;
  deleteEdge?: (id: number) => void;
}

export function createDataProvider(cacheUpdaters: CacheUpdaters = {}): DataProvider {
  return {
    getList: async ({ resource, pagination, sorters, filters }) => {
      const { current = 1, pageSize = 10 } = pagination ?? {};

      const params = new URLSearchParams();
      params.append('skip', String((current - 1) * pageSize));
      params.append('limit', String(pageSize));

      // ソート
      if (sorters && sorters.length > 0) {
        const { field, order } = sorters[0];
        params.append('sort_by', field);
        params.append('sort_order', order);
      }

      // フィルター
      if (filters) {
        filters.forEach((filter) => {
          if ('field' in filter && filter.value !== undefined) {
            params.append(filter.field, String(filter.value));
          }
        });
      }

      const response = await fetch(`${API_URL}/${resource}?${params}`);
      const data = await response.json();

      return {
        data: data.items ?? data,
        total: data.total ?? data.length,
      };
    },

    getOne: async ({ resource, id }) => {
      const response = await fetch(`${API_URL}/${resource}/${id}`);
      const data = await response.json();

      return { data };
    },

    create: async ({ resource, variables }) => {
      const response = await fetch(`${API_URL}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      const data = await response.json();

      // Update local cache
      if (resource === 'terms' && cacheUpdaters.addTerm) {
        cacheUpdaters.addTerm(data);
      } else if (resource === 'edges' && cacheUpdaters.addEdge) {
        cacheUpdaters.addEdge(data);
      }

      return { data };
    },

    update: async ({ resource, id, variables }) => {
      const response = await fetch(`${API_URL}/${resource}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      const data = await response.json();

      // Update local cache
      if (resource === 'terms' && cacheUpdaters.updateTerm) {
        cacheUpdaters.updateTerm(data);
      } else if (resource === 'edges' && cacheUpdaters.updateEdge) {
        cacheUpdaters.updateEdge(data);
      }

      return { data };
    },

    deleteOne: async ({ resource, id }) => {
      const response = await fetch(`${API_URL}/${resource}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      // Update local cache
      if (resource === 'terms' && cacheUpdaters.deleteTerm) {
        cacheUpdaters.deleteTerm(Number(id));
      } else if (resource === 'edges' && cacheUpdaters.deleteEdge) {
        cacheUpdaters.deleteEdge(Number(id));
      }

      return { data };
    },

    getApiUrl: () => API_URL,

    // Optional methods
    getMany: async ({ resource, ids }) => {
      const promises = ids.map((id) =>
        fetch(`${API_URL}/${resource}/${id}`).then((res) => res.json())
      );
      const data = await Promise.all(promises);

      return { data };
    },

    custom: async ({ url, method, payload }) => {
      const response = await fetch(`${API_URL}${url}`, {
        method: method ?? 'GET',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await response.json();

      return { data };
    },
  };
}

// Default export for backward compatibility (without cache updates)
export const dataProvider = createDataProvider();
