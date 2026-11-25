import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Edit3,
  Info,
  PiggyBank,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react';
import type { BootstrapPayload, Transaction } from '../types';
import { formatMonthTitle, formatVND, WALLET_TYPE_LABELS } from '../lib/format';
import { IconBadge } from './IconBadge';
import type { NavTab } from './Sidebar';

interface DashboardViewProps {
  data: BootstrapPayload;
  compactNumbers: boolean;
  hideBalances: boolean;
  onEditTx: (tx: Transaction) => void;
  onDeleteTx: (tx: Transaction) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  compactNumbers,
  hideBalances,
  onEditTx,
  onDeleteTx,
  onNavigate,
}) => {
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const { analytics, wallets, categories, transactions, month } = data;

  const mask = (v: number, compact = compactNumbers) => (hideBalances ? '•••••• ₫' : formatVND(v, compact));

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)).slice(0, 7),
    [transactions, month]
  );

  const renderDeltaBadge = (pct: number | null, invertGood = false) => {
    if (pct === null) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          Tháng đầu
        </span>
      );
    }
    const isPositive = pct >= 0;
    const isGood = invertGood ? !isPositive : isPositive;
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono-num text-[11px] font-semibold ${
          isGood
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
        }`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}
        {pct}% vs T trước
      </span>
    );
  };

  const healthColor =
    analytics.healthScore >= 75
      ? 'text-emerald-500'
      : analytics.healthScore >= 50
        ? 'text-amber-500'
        : 'text-rose-500';

  return (
    <div className="space-y-6">
      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Net Worth */}
        <div className="glass-card-hover relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng tài sản ròng
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <WalletIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 font-mono-num text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mask(analytics.totalBalance)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{wallets.length} ví đang hoạt động</span>
            <button onClick={() => onNavigate('wallets')} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Quản lý ví →
            </button>
          </div>
        </div>

        {/* Month Income */}
        <div className="glass-card-hover relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-500/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Thu nhập {formatMonthTitle(month)}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 font-mono-num text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            +{mask(analytics.monthIncome)}
          </div>
          <div className="mt-2 flex items-center justify-between">{renderDeltaBadge(analytics.incomeChangePct, false)}</div>
        </div>

        {/* Month Expense */}
        <div className="glass-card-hover relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-500/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chi tiêu {formatMonthTitle(month)}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 font-mono-num text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            -{mask(analytics.monthExpense)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {renderDeltaBadge(analytics.expenseChangePct, true)}
            <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
              ~{mask(analytics.avgDailyExpense, true)}/ngày
            </span>
          </div>
        </div>

        {/* Net Cashflow + Health Score */}
        <div className="glass-card-hover relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/15 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dòng tiền ròng & Sức khoẻ
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <PiggyBank className="h-4 w-4" />
            </span>
          </div>
          <div
            className={`mt-3 font-mono-num text-2xl font-bold tracking-tight ${
              analytics.netCashflow >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'
            }`}
          >
            {analytics.netCashflow >= 0 ? '+' : ''}
            {mask(analytics.netCashflow)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Tích luỹ: <strong className="font-mono-num text-emerald-500">{analytics.savingsRate}%</strong>
            </span>
            <span className={`font-mono-num font-bold ${healthColor}`}>Điểm: {analytics.healthScore}/100</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Cashflow Trend Chart */}
        <div className="glass-card p-5 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Biểu đồ dòng tiền</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {chartMode === 'daily'
                  ? `Biến động thu / chi từng ngày trong ${formatMonthTitle(month)}`
                  : 'So sánh thu nhập & chi tiêu 6 tháng gần nhất'}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                onClick={() => setChartMode('daily')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  chartMode === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Theo ngày
              </button>
              <button
                onClick={() => setChartMode('monthly')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  chartMode === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                6 tháng
              </button>
            </div>
          </div>

          <div className="h-[290px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'daily' ? (
                <AreaChart data={analytics.dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatVND(Number(v), true)}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(14, 21, 37, 0.94)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [
                      formatVND(Number(value ?? 0)),
                      name === 'income' ? 'Thu nhập' : 'Chi tiêu',
                    ]}
                    labelFormatter={(label) => `Ngày ${label} (${formatMonthTitle(month)})`}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#gradIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#F43F5E"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#gradExpense)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={analytics.monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => formatVND(Number(v), true)}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(14, 21, 37, 0.94)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [
                      formatVND(Number(value ?? 0)),
                      name === 'income' ? 'Thu nhập' : 'Chi tiêu',
                    ]}
                  />
                  <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="glass-card p-5 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cơ cấu chi tiêu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Phân bổ theo từng danh mục trong tháng</p>
            </div>
            <span className="font-mono-num text-xs font-semibold text-rose-500">
              {mask(analytics.monthExpense, true)}
            </span>
          </div>

          {analytics.categoryBreakdown.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-slate-400">
              <Sparkles className="mb-2 h-8 w-8 text-slate-400/50" />
              Chưa có khoản chi nào trong {formatMonthTitle(month)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-center">
              <div className="relative h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {analytics.categoryBreakdown.map((item, idx) => (
                        <Cell key={`${item.categoryId ?? 'other'}-${idx}`} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(14, 21, 37, 0.94)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [formatVND(Number(value ?? 0)), 'Đã chi']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Tổng chi</span>
                  <span className="font-mono-num text-sm font-bold text-slate-900 dark:text-white">
                    {mask(analytics.monthExpense, true)}
                  </span>
                </div>
              </div>

              <div className="max-h-[245px] space-y-2.5 overflow-y-auto pr-1">
                {analytics.categoryBreakdown.map((item, idx) => (
                  <div key={`${item.categoryId ?? 'other'}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="font-mono-num shrink-0 font-semibold text-slate-900 dark:text-white">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, item.percentage)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wallets Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Ví & Tài khoản của bạn</h3>
          <button
            onClick={() => onNavigate('wallets')}
            className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Xem chi tiết & Hũ tiết kiệm →
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="glass-card-hover relative overflow-hidden p-4"
              style={{ borderTop: `3px solid ${w.color}` }}
            >
              <div className="flex items-center justify-between">
                <IconBadge icon={w.icon} color={w.color} size="sm" />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {WALLET_TYPE_LABELS[w.type] || w.type}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{w.name}</div>
              <div className="mt-1 font-mono-num text-lg font-bold text-slate-900 dark:text-white">
                {mask(w.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Insights + Recent Transactions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Smart Insights */}
        <div className="glass-card p-5 lg:col-span-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Phân tích thông minh</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dự phóng chi tiêu tháng: <span className="font-mono-num font-semibold">{mask(analytics.projectedMonthExpense, true)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {analytics.insights.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400 dark:border-white/10">
                Ghi thêm giao dịch để nhận phân tích sức khoẻ tài chính tự động.
              </div>
            ) : (
              analytics.insights.map((ins) => {
                const styleMap = {
                  positive: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
                  warning: 'border-amber-500/25 bg-amber-500/8 text-amber-600 dark:text-amber-400',
                  danger: 'border-rose-500/25 bg-rose-500/8 text-rose-600 dark:text-rose-400',
                  info: 'border-sky-500/25 bg-sky-500/8 text-sky-600 dark:text-sky-400',
                };
                const Icon =
                  ins.tone === 'positive'
                    ? CheckCircle2
                    : ins.tone === 'warning' || ins.tone === 'danger'
                      ? AlertTriangle
                      : Info;
                return (
                  <div key={ins.id} className={`rounded-2xl border p-3.5 ${styleMap[ins.tone]}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{ins.title}</div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {ins.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Giao dịch gần đây</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Trong {formatMonthTitle(month)}</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Xem tất cả →
            </button>
          </div>

          {monthTransactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-400">
              Chưa có giao dịch nào trong tháng này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {monthTransactions.map((tx) => {
                const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
                const wallet = walletMap.get(tx.wallet_id);
                const toWallet = tx.to_wallet_id ? walletMap.get(tx.to_wallet_id) : undefined;
                const title =
                  tx.note ||
                  (tx.type === 'transfer'
                    ? `Chuyển ví → ${toWallet?.name || ''}`
                    : cat?.name || 'Giao dịch');

                return (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02] rounded-xl px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconBadge
                        icon={tx.type === 'transfer' ? 'ArrowLeftRight' : cat?.icon || 'Tag'}
                        color={tx.type === 'transfer' ? '#6366F1' : cat?.color || '#64748B'}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{wallet?.name || 'Ví'}</span>
                          {cat && (
                            <>
                              <span>•</span>
                              <span>{cat.name}</span>
                            </>
                          )}
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
                      <div className="hidden sm:flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => onEditTx(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                          title="Sửa"
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
          )}
        </div>
      </div>
    </div>
  );
};
