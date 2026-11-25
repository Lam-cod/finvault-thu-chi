import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';
import type { BootstrapPayload } from '../types';
import { formatMonthTitle, formatVND } from '../lib/format';
import { IconBadge } from './IconBadge';
import { api } from '../lib/api';

interface BudgetsViewProps {
  data: BootstrapPayload;
  compactNumbers: boolean;
  hideBalances: boolean;
  onRefresh: () => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  data,
  compactNumbers,
  hideBalances,
  onRefresh,
}) => {
  const { budgets, categories, month } = data;
  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  const [selectedCatId, setSelectedCatId] = useState<number>(expenseCategories[0]?.id || 0);
  const [amountInput, setAmountInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const mask = (v: number) => (hideBalances ? '•••••• ₫' : formatVND(v, compactNumbers));

  const totalPlanned = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  const [yr, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === yr && today.getMonth() + 1 === mo;
  const remainingDays = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate() + 1) : daysInMonth;
  const remainingBudget = Math.max(0, totalPlanned - totalSpent);
  const safeDailyBudget = Math.round(remainingBudget / remainingDays);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountInput.replace(/[^\d]/g, ''));
    const catId = selectedCatId || expenseCategories[0]?.id;
    if (!catId || !Number.isFinite(num) || num <= 0) return;

    setSaving(true);
    try {
      await api.saveBudget({ category_id: catId, month, amount: num });
      setAmountInput('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteBudget(id);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Hero Summary */}
      <div className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Target className="h-3.5 w-3.5" />
              Ngân sách {formatMonthTitle(month)}
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-mono-num text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {mask(totalSpent)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                / tổng định mức <strong className="font-mono-num">{mask(totalPlanned)}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-right">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Còn lại trong tháng</div>
              <div className="font-mono-num text-base font-bold text-emerald-500">{mask(remainingBudget)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Mức chi an toàn/ngày</div>
              <div className="font-mono-num text-base font-bold text-slate-900 dark:text-white">
                {mask(safeDailyBudget)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Tiến độ sử dụng tổng ngân sách</span>
            <span className={totalPct > 100 ? 'text-rose-500' : totalPct >= 80 ? 'text-amber-500' : 'text-emerald-500'}>
              {totalPct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalPct > 100 ? 'bg-rose-500' : totalPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, totalPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Set / Update Budget Form */}
      <form onSubmit={handleSaveBudget} className="glass-card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục chi tiêu</label>
          <select
            value={selectedCatId || expenseCategories[0]?.id || ''}
            onChange={(e) => setSelectedCatId(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
          >
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hạn mức tháng (VNĐ)
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="VD: 3.000.000"
            value={
              amountInput
                ? new Intl.NumberFormat('vi-VN').format(Number(amountInput.replace(/[^\d]/g, '')))
                : ''
            }
            onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ''))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono-num text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Đặt / Cập nhật hạn mức
        </button>
      </form>

      {/* Budget Cards Grid */}
      {budgets.length === 0 ? (
        <div className="glass-card py-14 text-center text-sm text-slate-400">
          Chưa có hạn mức nào cho {formatMonthTitle(month)}. Hãy thêm ngân sách ở phía trên để kiểm soát chi tiêu!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgets.map((b) => {
            const pct = Math.round((b.spent / b.amount) * 100);
            const over = b.spent > b.amount;
            const warn = !over && pct >= 80;
            const barColor = over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500';

            return (
              <div key={b.id} className="glass-card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={b.category_icon} color={b.category_color} />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{b.category_name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                        {over ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Vượt {mask(b.spent - b.amount)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Còn {mask(b.amount - b.spent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
                    title="Xoá ngân sách"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between font-mono-num text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{mask(b.spent)}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Hạn mức {mask(b.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
