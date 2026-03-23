const API_URL = '/api/admin';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_SECRET ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (ADMIN_TOKEN) {
    headers.set('Authorization', `Bearer ${ADMIN_TOKEN}`);
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

type RawList<T> = { items: T[]; total: number } | T[];

async function fetchList<T>(
  resource: string,
  params?: URLSearchParams,
): Promise<{ data: T[]; total: number }> {
  const url = `/${resource}${params ? `?${params}` : ''}`;
  const raw = await request<RawList<T>>(url);
  if (Array.isArray(raw)) return { data: raw, total: raw.length };
  return { data: raw.items ?? [], total: raw.total ?? 0 };
}

export const api = {
  list: fetchList,

  get: <T>(resource: string, id: string | number) =>
    request<T>(`/${resource}/${id}`),

  create: <T>(resource: string, data: unknown) =>
    request<T>(`/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T>(resource: string, id: string | number, data: unknown) =>
    request<T>(`/${resource}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T>(resource: string, id: string | number) =>
    request<T>(`/${resource}/${id}`, { method: 'DELETE' }),
};
