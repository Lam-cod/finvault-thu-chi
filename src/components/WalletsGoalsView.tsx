import React, { useState } from 'react';
import { ArrowLeftRight, PiggyBank, Plus, Trash2, Wallet as WalletIcon } from 'lucide-react';
import type { BootstrapPayload, SavingsGoal, WalletType } from '../types';
import { formatVND, WALLET_TYPE_LABELS } from '../lib/format';
import { IconBadge } from './IconBadge';
import { api } from '../lib/api';

interface WalletsGoalsViewProps {
  data: BootstrapPayload;
  compactNumbers: boolean;
  hideBalances: boolean;
  onRefresh: () => Promise<void>;
  onOpenTransfer: () => void;
}

const WALLET_COLORS = ['#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4'];

export const WalletsGoalsView: React.FC<WalletsGoalsViewProps> = ({
  data,
  compactNumbers,
  hideBalances,
  onRefresh,
  onOpenTransfer,
}) => {
  const { wallets, savingsGoals } = data;
  const mask = (v: number) => (hideBalances ? '•••••• ₫' : formatVND(v, compactNumbers));

  // New wallet form
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [wName, setWName] = useState('');
  const [wType, setWType] = useState<WalletType>('bank');
  const [wBalance, setWBalance] = useState('');
  const [wColor, setWColor] = useState('#3B82F6');

  // New goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gDeadline, setGDeadline] = useState('');
  const [gColor, setGColor] = useState('#10B981');

  // Contribute to goal modal
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribWalletId, setContribWalletId] = useState<string>('');

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName.trim()) return;
    const iconByType: Record<WalletType, string> = {
      cash: 'Wallet',
      bank: 'Landmark',
      ewallet: 'Smartphone',
      credit: 'CreditCard',
      investment: 'TrendingUp',
    };
    await api.createWallet({
      name: wName.trim(),
      type: wType,
      balance: Number(wBalance.replace(/[^\d-]/g, '') || 0),
      color: wColor,
      icon: iconByType[wType],
    });
    setWName('');
    setWBalance('');
    setShowWalletForm(false);
    await onRefresh();
  };

  const handleDeleteWallet = async (id: number) => {
    if (!confirm('Xoá ví này? Các giao dịch thuộc ví này cũng sẽ bị xoá.')) return;
    await api.deleteWallet(id);
    await onRefresh();
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(gTarget.replace(/[^\d]/g, ''));
    if (!gName.trim() || !target) return;
    await api.createGoal({
      name: gName.trim(),
      target_amount: target,
      current_amount: 0,
      color: gColor,
      icon: 'Target',
      deadline: gDeadline || null,
    });
    setGName('');
    setGTarget('');
    setGDeadline('');
    setShowGoalForm(false);
    await onRefresh();
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const amt = Number(contribAmount.replace(/[^\d]/g, ''));
    if (!amt || amt <= 0) return;
    await api.contributeGoal(contributingGoal.id, {
      amount: amt,
      wallet_id: contribWalletId ? Number(contribWalletId) : null,
    });
    setContributingGoal(null);
    setContribAmount('');
    setContribWalletId('');
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Wallets Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ví & Tài khoản</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Theo dõi số dư thực tế trên từng nguồn tiền</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-500/20 dark:text-indigo-300"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Chuyển tiền giữa ví
            </button>
            <button
              onClick={() => setShowWalletForm(!showWalletForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm ví mới
            </button>
          </div>
        </div>

        {showWalletForm && (
          <form onSubmit={handleAddWallet} className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4 items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Tên ví</label>
              <input
                type="text"
                required
                placeholder="VD: Vietcombank, ZaloPay..."
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Loại ví</label>
              <select
                value={wType}
                onChange={(e) => setWType(e.target.value as WalletType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              >
                <option value="bank">Ngân hàng</option>
                <option value="cash">Tiền mặt</option>
                <option value="ewallet">Ví điện tử</option>
                <option value="investment">Đầu tư & Tiết kiệm</option>
                <option value="credit">Thẻ tín dụng</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Số dư ban đầu (₫)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={wBalance ? new Intl.NumberFormat('vi-VN').format(Number(wBalance)) : ''}
                onChange={(e) => setWBalance(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono-num text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {WALLET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWColor(c)}
                    className={`h-6 w-6 rounded-full ${wColor === c ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button type="submit" className="ml-auto rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">
                Lưu ví
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="glass-card-hover relative overflow-hidden p-5"
              style={{
                backgroundImage: `radial-gradient(circle at top right, ${w.color}22, transparent 58%)`,
              }}
            >
              <div className="flex items-start justify-between">
                <IconBadge icon={w.icon} color={w.color} size="md" />
                {wallets.length > 1 && (
                  <button
                    onClick={() => handleDeleteWallet(w.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
                    title="Xoá ví"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                {WALLET_TYPE_LABELS[w.type] || w.type}
              </div>
              <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{w.name}</div>
              <div className="mt-2 font-mono-num text-xl font-bold text-slate-900 dark:text-white">
                {mask(w.balance)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Savings Goals Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hũ tiết kiệm & Mục tiêu</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tích luỹ từng bước cho các kế hoạch lớn</p>
          </div>
          <button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo mục tiêu mới
          </button>
        </div>

        {showGoalForm && (
          <form onSubmit={handleAddGoal} className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4 items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Tên mục tiêu</label>
              <input
                type="text"
                required
                placeholder="VD: Mua xe, Quỹ khẩn cấp..."
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Số tiền mục tiêu (₫)</label>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="VD: 50.000.000"
                value={gTarget ? new Intl.NumberFormat('vi-VN').format(Number(gTarget)) : ''}
                onChange={(e) => setGTarget(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono-num text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Hạn hoàn thành</label>
              <input
                type="date"
                value={gDeadline}
                onChange={(e) => setGDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {WALLET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGColor(c)}
                    className={`h-6 w-6 rounded-full ${gColor === c ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button type="submit" className="ml-auto rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white">
                Tạo hũ
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {savingsGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);

            return (
              <div key={goal.id} className="glass-card-hover flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between">
                    <IconBadge icon={goal.icon} color={goal.color} />
                    <button
                      onClick={async () => {
                        await api.deleteGoal(goal.id);
                        await onRefresh();
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
                      title="Xoá mục tiêu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 text-base font-bold text-slate-900 dark:text-white">{goal.name}</div>
                  {goal.deadline && (
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Hạn: {goal.deadline}</div>
                  )}

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between font-mono-num text-xs">
                      <span className="font-bold" style={{ color: goal.color }}>
                        {mask(goal.current_amount)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Mục tiêu: {mask(goal.target_amount)}</span>
                      <span>Còn {mask(remaining)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setContributingGoal(goal);
                    setContribAmount('1000000');
                    setContribWalletId(String(wallets[0]?.id || ''));
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <PiggyBank className="h-3.5 w-3.5" />
                  Nạp thêm vào hũ
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contribute Modal */}
      {contributingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleContribute}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0E1525] space-y-4"
          >
            <div className="flex items-center gap-3">
              <IconBadge icon={contributingGoal.icon} color={contributingGoal.color} />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nạp vào hũ tiết kiệm</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{contributingGoal.name}</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Số tiền nạp (VNĐ)</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={contribAmount ? new Intl.NumberFormat('vi-VN').format(Number(contribAmount)) : ''}
                onChange={(e) => setContribAmount(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono-num text-lg font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Trích từ ví (tuỳ chọn)</label>
              <div className="relative">
                <WalletIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={contribWalletId}
                  onChange={(e) => setContribWalletId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
                >
                  <option value="">Chỉ cập nhật số dư hũ (không trừ ví)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance, true)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-white/10"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-white"
              >
                Xác nhận nạp
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
