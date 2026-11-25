import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { BootstrapPayload, Transaction, TransactionType } from './types';
import { api } from './lib/api';
import { getCurrentYearMonth } from './lib/format';
import { MonthSwitcher, Sidebar, type NavTab } from './components/Sidebar';
import { TransactionModal } from './components/TransactionModal';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { WalletsGoalsView } from './components/WalletsGoalsView';
import { AnalyticsCalendarView } from './components/AnalyticsCalendarView';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // UI preferences persisted in localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('finvault-theme');
    return saved ? saved === 'dark' : true;
  });
  const [compactNumbers, setCompactNumbers] = useState<boolean>(() => {
    return localStorage.getItem('finvault-compact') === 'true';
  });
  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    return localStorage.getItem('finvault-hide') === 'true';
  });

  // Transaction Modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('finvault-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const payload = await api.bootstrap(month);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ FinVault');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keyboard shortcut 'N' for quick transaction entry
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'n' || e.key === 'N') && !txModalOpen) {
        e.preventDefault();
        setEditingTx(null);
        setModalDefaultDate(undefined);
        setModalDefaultType('expense');
        setTxModalOpen(true);
      } else if (e.key === 'Escape' && txModalOpen) {
        setTxModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [txModalOpen]);

  const openNewTx = (opts?: { date?: string; type?: TransactionType }) => {
    setEditingTx(null);
    setModalDefaultDate(opts?.date);
    setModalDefaultType(opts?.type || 'expense');
    setTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setModalDefaultDate(undefined);
    setTxModalOpen(true);
  };

  const handleDeleteTx = async (tx: Transaction) => {
    if (!confirm(`Xoá giao dịch "${tx.note || 'này'}"? Số dư ví sẽ được hoàn lại tự động.`)) return;
    await api.deleteTransaction(tx.id);
    await fetchData();
  };

  const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Bảng điều khiển tài chính',
      subtitle: 'Toàn cảnh dòng tiền, ví, ngân sách & phân tích thông minh',
    },
    transactions: {
      title: 'Sổ giao dịch chi tiết',
      subtitle: 'Tìm kiếm, lọc nhanh và xuất báo cáo Excel',
    },
    budgets: {
      title: 'Kế hoạch & Ngân sách tháng',
      subtitle: 'Kiểm soát hạn mức chi tiêu theo từng danh mục',
    },
    wallets: {
      title: 'Ví tiền & Hũ tiết kiệm',
      subtitle: 'Quản lý đa nguồn tiền và mục tiêu tích luỹ',
    },
    calendar: {
      title: 'Lịch thu chi & Sao lưu dữ liệu',
      subtitle: 'Bản đồ nhiệt chi tiêu theo ngày và lưu trữ SQLite an toàn',
    },
  };

  return (
    <div className="relative min-h-screen bg-[#F4F7FB] text-slate-900 dark:bg-[#070B14] dark:text-slate-100">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.16),_transparent_65%)]" />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          month={month}
          onMonthChange={setMonth}
          totalBalance={data?.analytics.totalBalance ?? 0}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((v) => !v)}
          compactNumbers={compactNumbers}
          onToggleCompact={() => {
            setCompactNumbers((v) => {
              localStorage.setItem('finvault-compact', String(!v));
              return !v;
            });
          }}
          hideBalances={hideBalances}
          onToggleHideBalances={() => {
            setHideBalances((v) => {
              localStorage.setItem('finvault-hide', String(!v));
              return !v;
            });
          }}
          onOpenNewTx={() => openNewTx()}
        />

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Header */}
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {TAB_TITLES[activeTab].title}
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {TAB_TITLES[activeTab].subtitle}
                </p>
              </div>
              <MonthSwitcher month={month} onMonthChange={setMonth} />
            </header>

            {error && (
              <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
                <span>{error}</span>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                </button>
              </div>
            )}

            {loading || !data ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card h-32 animate-pulse bg-slate-200/50 dark:bg-white/5" />
                ))}
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    data={data}
                    compactNumbers={compactNumbers}
                    hideBalances={hideBalances}
                    onEditTx={handleEditTx}
                    onDeleteTx={handleDeleteTx}
                    onNavigate={setActiveTab}
                  />
                )}
                {activeTab === 'transactions' && (
                  <TransactionsView
                    data={data}
                    compactNumbers={compactNumbers}
                    hideBalances={hideBalances}
                    onEditTx={handleEditTx}
                    onDeleteTx={handleDeleteTx}
                    onOpenNewTx={() => openNewTx()}
                  />
                )}
                {activeTab === 'budgets' && (
                  <BudgetsView
                    data={data}
                    compactNumbers={compactNumbers}
                    hideBalances={hideBalances}
                    onRefresh={fetchData}
                  />
                )}
                {activeTab === 'wallets' && (
                  <WalletsGoalsView
                    data={data}
                    compactNumbers={compactNumbers}
                    hideBalances={hideBalances}
                    onRefresh={fetchData}
                    onOpenTransfer={() => openNewTx({ type: 'transfer' })}
                  />
                )}
                {activeTab === 'calendar' && (
                  <AnalyticsCalendarView
                    data={data}
                    compactNumbers={compactNumbers}
                    hideBalances={hideBalances}
                    onRefresh={fetchData}
                    onAddTxForDate={(d) => openNewTx({ date: d })}
                    onEditTx={handleEditTx}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {data && (
        <TransactionModal
          open={txModalOpen}
          onClose={() => setTxModalOpen(false)}
          wallets={data.wallets}
          categories={data.categories}
          editingTx={editingTx}
          defaultDate={modalDefaultDate}
          defaultType={modalDefaultType}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

export default App;
