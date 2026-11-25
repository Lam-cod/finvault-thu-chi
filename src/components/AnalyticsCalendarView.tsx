import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, Download, FileJson, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import type { BootstrapPayload, Transaction } from '../types';
import { formatMonthTitle, formatVietnameseDateHeading, formatVND } from '../lib/format';
import { IconBadge } from './IconBadge';
import { api } from '../lib/api';

interface AnalyticsCalendarViewProps {
  data: BootstrapPayload;
  compactNumbers: boolean;
  hideBalances: boolean;
  onRefresh: () => Promise<void>;
  onAddTxForDate: (date: string) => void;
  onEditTx: (tx: Transaction) => void;
}

export const AnalyticsCalendarView: React.FC<AnalyticsCalendarViewProps> = ({
  data,
  compactNumbers,
  hideBalances,
  onRefresh,
  onAddTxForDate,
  onEditTx,
}) => {
  const { month, transactions, categories, wallets } = data;
  const [selectedDay, setSelectedDay] = useState<string>(`${month}-01`);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mask = (v: number, compact = compactNumbers) => (hideBalances ? '••••' : formatVND(v, compact));

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const calendarGrid = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;

    const dailyAgg = new Map<string, { income: number; expense: number; count: number }>();
    let maxExpense = 1;

    for (const tx of transactions) {
      if (!tx.date.startsWith(month)) continue;
      const cur = dailyAgg.get(tx.date) || { income: 0, expense: 0, count: 0 };
      if (tx.type === 'income') cur.income += tx.amount;
      else if (tx.type === 'expense') {
        cur.expense += tx.amount;
        if (cur.expense > maxExpense) maxExpense = cur.expense;
      }
      cur.count += 1;
      dailyAgg.set(tx.date, cur);
    }

    const cells: Array<{
      date: string | null;
      day: number | null;
      income: number;
      expense: number;
      count: number;
      intensity: number;
    }> = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ date: null, day: null, income: 0, expense: 0, count: 0, intensity: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      const agg = dailyAgg.get(dateStr) || { income: 0, expense: 0, count: 0 };
      cells.push({
        date: dateStr,
        day: d,
        income: agg.income,
        expense: agg.expense,
        count: agg.count,
        intensity: agg.expense > 0 ? Math.max(0.15, agg.expense / maxExpense) : 0,
      });
    }
    return cells;
  }, [month, transactions]);

  const activeDay = selectedDay.startsWith(month) ? selectedDay : `${month}-01`;
  const dayTransactions = useMemo(
    () => transactions.filter((t) => t.date === activeDay),
    [transactions, activeDay]
  );

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.importJson(json);
      await onRefresh();
      setStatusMsg('Khôi phục dữ liệu từ file JSON thành công!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Lỗi đọc file JSON');
    } finally {
      e.target.value = '';
    }
  };

  const handleClearDemo = async () => {
    await api.clearDemo();
    setConfirmClear(false);
    await onRefresh();
    setStatusMsg('Đã xoá sạch dữ liệu mẫu. Bạn đã sẵn sàng ghi thu chi thực tế!');
  };

  const handleReseedDemo = async () => {
    await api.reseedDemo();
    await onRefresh();
    setStatusMsg('Đã khôi phục bộ dữ liệu mẫu minh hoạ.');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Monthly Calendar Heatmap */}
        <div className="glass-card p-5 xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Lịch thu chi {formatMonthTitle(month)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bấm vào từng ngày để xem chi tiết hoặc ghi bổ sung
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-slate-400 mb-2">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div>CN</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarGrid.map((cell, idx) => {
              if (!cell.date || !cell.day) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl bg-transparent" />;
              }
              const isSelected = cell.date === activeDay;
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDay(cell.date!)}
                  className={`flex h-16 sm:h-20 flex-col justify-between rounded-xl border p-1.5 text-left transition ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10'
                      : 'border-slate-200/70 hover:border-slate-300 dark:border-white/[0.07] dark:hover:border-white/20'
                  }`}
                  style={{
                    backgroundColor:
                      !isSelected && cell.intensity > 0
                        ? `rgba(244, 63, 94, ${Math.min(0.26, cell.intensity * 0.28)})`
                        : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {cell.day}
                    </span>
                    {cell.count > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>

                  <div className="space-y-0.5 font-mono-num text-[9px] sm:text-[10px] leading-tight">
                    {cell.income > 0 && (
                      <div className="truncate font-semibold text-emerald-600 dark:text-emerald-400">
                        +{mask(cell.income, true)}
                      </div>
                    )}
                    {cell.expense > 0 && (
                      <div className="truncate font-semibold text-rose-600 dark:text-rose-400">
                        -{mask(cell.expense, true)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="glass-card flex flex-col justify-between p-5 xl:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.07]">
              <div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Chi tiết ngày</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatVietnameseDateHeading(activeDay)}
                </div>
              </div>
              <button
                onClick={() => onAddTxForDate(activeDay)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm
              </button>
            </div>

            <div className="mt-3 max-h-[340px] space-y-2.5 overflow-y-auto">
              {dayTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không có giao dịch nào trong ngày {activeDay}.
                </div>
              ) : (
                dayTransactions.map((tx) => {
                  const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
                  const w = walletMap.get(tx.wallet_id);
                  return (
                    <button
                      key={tx.id}
                      onClick={() => onEditTx(tx)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 text-left transition hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconBadge
                          icon={tx.type === 'transfer' ? 'ArrowLeftRight' : cat?.icon || 'Tag'}
                          color={tx.type === 'transfer' ? '#6366F1' : cat?.color || '#64748B'}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {tx.note || cat?.name || 'Giao dịch'}
                          </div>
                          <div className="text-[10px] text-slate-400">{w?.name}</div>
                        </div>
                      </div>
                      <span
                        className={`font-mono-num shrink-0 text-xs font-bold ${
                          tx.type === 'income'
                            ? 'text-emerald-500'
                            : tx.type === 'transfer'
                              ? 'text-indigo-400'
                              : 'text-rose-500'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {mask(tx.amount)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Management & Backup Card */}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sao lưu & Quản lý dữ liệu SQLite</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Dữ liệu được lưu vĩnh viễn tại <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">D:\web_test\data\finance.db</code>
            </p>
          </div>
          {statusMsg && (
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {statusMsg}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/api/export/csv"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:border-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-white">Xuất Excel (CSV)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Chuẩn UTF-8 tiếng Việt</div>
            </div>
          </a>

          <a
            href="/api/export/json"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-500/40 hover:bg-sky-500/5 dark:border-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-white">Sao lưu toàn bộ (.JSON)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Ví, giao dịch, ngân sách, hũ</div>
            </div>
          </a>

          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/5 dark:border-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-white">Khôi phục (.JSON)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Nhập lại bản sao lưu</div>
            </div>
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
          </button>

          <div className="flex flex-col gap-2">
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                Bắt đầu sổ mới (Xoá dữ liệu mẫu)
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-500 bg-rose-500/10 p-2">
                <button
                  onClick={handleClearDemo}
                  className="flex-1 rounded-lg bg-rose-500 py-1.5 text-xs font-bold text-white"
                >
                  Xác nhận xoá
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400"
                >
                  Huỷ
                </button>
              </div>
            )}

            <button
              onClick={handleReseedDemo}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục dữ liệu mẫu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
