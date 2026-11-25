import React from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  ListOrdered,
  Moon,
  PiggyBank,
  Plus,
  Sun,
  Target,
  Wallet as WalletIcon,
} from 'lucide-react';
import { formatMonthTitle, formatVND, getCurrentYearMonth, shiftYearMonth } from '../lib/format';

export type NavTab = 'dashboard' | 'transactions' | 'budgets' | 'wallets' | 'calendar';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  month: string;
  onMonthChange: (ym: string) => void;
  totalBalance: number;
  darkMode: boolean;
  onToggleDark: () => void;
  compactNumbers: boolean;
  onToggleCompact: () => void;
  hideBalances: boolean;
  onToggleHideBalances: () => void;
  onOpenNewTx: () => void;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'transactions', label: 'Sổ giao dịch', icon: ListOrdered },
  { id: 'budgets', label: 'Ngân sách', icon: Target },
  { id: 'wallets', label: 'Ví & Tiết kiệm', icon: WalletIcon },
  { id: 'calendar', label: 'Lịch & Dữ liệu', icon: CalendarDays },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  month,
  onMonthChange,
  totalBalance,
  darkMode,
  onToggleDark,
  compactNumbers,
  onToggleCompact,
  hideBalances,
  onToggleHideBalances,
  onOpenNewTx,
}) => {
  const isCurrentMonth = month === getCurrentYearMonth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-68 lg:shrink-0 lg:flex-col lg:justify-between border-r border-slate-200/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0A101E]/90">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white">FinVault</div>
                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Tài chính cá nhân</div>
              </div>
            </div>
            <button
              onClick={onToggleDark}
              title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>
          </div>

          {/* Primary CTA */}
          <button
            onClick={onOpenNewTx}
            className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Ghi giao dịch
            </span>
            <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">N</kbd>
          </button>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-500 dark:text-emerald-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Net Worth + Quick Controls */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tổng tài sản ròng</span>
              <button
                onClick={onToggleHideBalances}
                className="rounded-md p-1 hover:bg-slate-200/70 dark:hover:bg-white/10"
                title={hideBalances ? 'Hiện số dư' : 'Ẩn số dư'}
              >
                {hideBalances ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1.5 font-mono-num text-lg font-bold text-slate-900 dark:text-white">
              {hideBalances ? '•••••••• ₫' : formatVND(totalBalance, compactNumbers)}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5 text-[11px] dark:border-white/[0.06]">
              <span className="text-slate-500 dark:text-slate-400">Hiển thị gọn (Tr/k)</span>
              <button
                onClick={onToggleCompact}
                className={`rounded-full px-2.5 py-0.5 font-semibold transition ${
                  compactNumbers
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {compactNumbers ? 'Bật' : 'Tắt'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar & Bottom Nav */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0A101E]/90">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
            <PiggyBank className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">FinVault</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleHideBalances}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10"
          >
            {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
          </button>
          <button
            onClick={onOpenNewTx}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghi mới
          </button>
        </div>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200/80 bg-white/95 py-2 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0A101E]/95">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium ${
                active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );

  // Month Switcher is rendered in Main Header inside App.tsx using exported helper
  void isCurrentMonth;
};

export const MonthSwitcher: React.FC<{
  month: string;
  onMonthChange: (ym: string) => void;
}> = ({ month, onMonthChange }) => {
  const isCurrent = month === getCurrentYearMonth();
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/90 p-1 shadow-xs dark:border-white/10 dark:bg-white/[0.04]">
        <button
          onClick={() => onMonthChange(shiftYearMonth(month, -1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          title="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[112px] px-2 text-center text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
          {formatMonthTitle(month)}
        </span>
        <button
          onClick={() => onMonthChange(shiftYearMonth(month, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          title="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {!isCurrent && (
        <button
          onClick={() => onMonthChange(getCurrentYearMonth())}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          Tháng này
        </button>
      )}
    </div>
  );
};
