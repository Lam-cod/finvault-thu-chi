import React, { useMemo, useState } from 'react';
import { Download, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type { BootstrapPayload, Transaction, TransactionType } from '../types';
import { formatVietnameseDateHeading, formatVND } from '../lib/format';
import { IconBadge } from './IconBadge';

interface TransactionsViewProps {
  data: BootstrapPayload;
  compactNumbers: boolean;
  hideBalances: boolean;
  onEditTx: (tx: Transaction) => void;
  onDeleteTx: (tx: Transaction) => void;
  onOpenNewTx: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  data,
  compactNumbers,
  hideBalances,
  onEditTx,
  onDeleteTx,
  onOpenNewTx,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [walletFilter, setWalletFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeMonthOnly, setScopeMonthOnly] = useState(true);

  const { transactions, categories, wallets, month } = data;

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const mask = (v: number) => (hideBalances ? '•••••• ₫' : formatVND(v, compactNumbers));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (scopeMonthOnly && !tx.date.startsWith(month)) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (walletFilter !== 'all' && tx.wallet_id !== Number(walletFilter) && tx.to_wallet_id !== Number(walletFilter)) {
        return false;
      }
      if (categoryFilter !== 'all' && tx.category_id !== Number(categoryFilter)) return false;
      if (q) {
        const catName = tx.category_id ? categoryMap.get(tx.category_id)?.name.toLowerCase() || '' : '';
        const wName = walletMap.get(tx.wallet_id)?.name.toLowerCase() || '';
        const hit =
          tx.note.toLowerCase().includes(q) ||
          tx.tags.toLowerCase().includes(q) ||
          catName.includes(q) ||
          wName.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [transactions, scopeMonthOnly, month, typeFilter, walletFilter, categoryFilter, search, categoryMap, walletMap]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const list = groups.get(tx.date) || [];
      list.push(tx);
      groups.set(tx.date, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const exportCsvUrl = scopeMonthOnly ? `/api/export/csv?month=${encodeURIComponent(month)}` : '/api/export/csv';

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo ghi chú, danh mục, ví, thẻ..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setScopeMonthOnly(!scopeMonthOnly)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                scopeMonthOnly
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'
              }`}
            >
              {scopeMonthOnly ? `Chỉ tháng ${month}` : 'Tất cả thời gian'}
            </button>

            <a
              href={exportCsvUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel (CSV)
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: 'all', label: 'Tất cả' },
            { id: 'expense', label: 'Chi tiêu' },
            { id: 'income', label: 'Thu nhập' },
            { id: 'transfer', label: 'Chuyển ví' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === t.id
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}

          <select
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-200"
          >
            <option value="all">Tất cả ví</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-200"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === 'income' ? 'Thu' : 'Chi'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered Totals Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng thu ({filtered.length} mục)</span>
          <span className="font-mono-num text-sm font-bold text-emerald-600 dark:text-emerald-400">+{mask(totals.income)}</span>
        </div>
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng chi</span>
          <span className="font-mono-num text-sm font-bold text-rose-600 dark:text-rose-400">-{mask(totals.expense)}</span>
        </div>
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chênh lệch</span>
          <span className={`font-mono-num text-sm font-bold ${totals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totals.net >= 0 ? '+' : ''}
            {mask(totals.net)}
          </span>
        </div>
      </div>

      {/* Date-grouped list */}
      {groupedByDate.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Không có giao dịch nào khớp bộ lọc hiện tại.
          </p>
          <button
            onClick={onOpenNewTx}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Ghi giao dịch mới
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateStr, items]) => {
            const dayNet = items.reduce((sum, tx) => {
              if (tx.type === 'income') return sum + tx.amount;
              if (tx.type === 'expense') return sum - tx.amount;
              return sum;
            }, 0);

            return (
              <div key={dateStr} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {formatVietnameseDateHeading(dateStr)}
                  </span>
                  <span
                    className={`font-mono-num text-xs font-semibold ${
                      dayNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {dayNet >= 0 ? '+' : ''}
                    {mask(dayNet)}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {items.map((tx) => {
                    const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
                    const w = walletMap.get(tx.wallet_id);
                    const tw = tx.to_wallet_id ? walletMap.get(tx.to_wallet_id) : undefined;
                    const title =
                      tx.note ||
                      (tx.type === 'transfer' ? `Chuyển ví → ${tw?.name || ''}` : cat?.name || 'Giao dịch');

                    return (
                      <div
                        key={tx.id}
                        className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconBadge
                            icon={tx.type === 'transfer' ? 'ArrowLeftRight' : cat?.icon || 'Tag'}
                            color={tx.type === 'transfer' ? '#6366F1' : cat?.color || '#64748B'}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">
                                {w?.name || 'Ví'}
                                {tx.type === 'transfer' && tw ? ` → ${tw.name}` : ''}
                              </span>
                              {cat && <span>{cat.name}</span>}
                              {tx.tags &&
                                tx.tags
                                  .split(',')
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                                  .map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono-num text-sm font-bold ${
                              tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : tx.type === 'transfer'
                                  ? 'text-indigo-500 dark:text-indigo-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                            {mask(tx.amount)}
                          </span>
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
                            <button
                              onClick={() => onEditTx(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTx(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500"
                              title="Xoá"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
