import type { BootstrapPayload, Category, SavingsGoal, Transaction, Wallet } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  bootstrap: (month: string) => request<BootstrapPayload>(`/api/bootstrap?month=${encodeURIComponent(month)}`),

  createTransaction: (data: Partial<Transaction>) =>
    request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),

  updateTransaction: (id: number, data: Partial<Transaction>) =>
    request<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTransaction: (id: number) => request<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),

  createWallet: (data: Partial<Wallet>) =>
    request<Wallet>('/api/wallets', { method: 'POST', body: JSON.stringify(data) }),

  updateWallet: (id: number, data: Partial<Wallet>) =>
    request<Wallet>(`/api/wallets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteWallet: (id: number) => request<{ ok: boolean }>(`/api/wallets/${id}`, { method: 'DELETE' }),

  createCategory: (data: Partial<Category>) =>
    request<Category>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),

  saveBudget: (data: { category_id: number; month: string; amount: number }) =>
    request<{ ok: boolean }>('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),

  deleteBudget: (id: number) => request<{ ok: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' }),

  createGoal: (data: Partial<SavingsGoal>) =>
    request<SavingsGoal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),

  contributeGoal: (id: number, data: { amount: number; wallet_id?: number | null }) =>
    request<SavingsGoal>(`/api/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify(data) }),

  deleteGoal: (id: number) => request<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),

  importJson: (payload: unknown) =>
    request<{ ok: boolean }>('/api/import/json', { method: 'POST', body: JSON.stringify(payload) }),

  clearDemo: () => request<{ ok: boolean }>('/api/demo/clear', { method: 'POST' }),
  reseedDemo: () => request<{ ok: boolean }>('/api/demo/seed', { method: 'POST' }),
};
