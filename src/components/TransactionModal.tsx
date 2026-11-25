import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Plus, X } from 'lucide-react';
import type { Category, Transaction, TransactionType, Wallet } from '../types';
import { formatVND, getTodayISO } from '../lib/format';
import { AVAILABLE_ICON_NAMES, IconBadge } from './IconBadge';
import { api } from '../lib/api';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  editingTx: Transaction | null;
  defaultDate?: string;
  defaultType?: TransactionType;
  onSaved: () => Promise<void>;
}

const COLOR_PRESETS = ['#10B981', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  onClose,
  wallets,
  categories,
  editingTx,
  defaultDate,
  defaultType = 'expense',
  onSaved,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [rawDigits, setRawDigits] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<number>(0);
  const [toWalletId, setToWalletId] = useState<number>(0);
  const [date, setDate] = useState<string>(getTodayISO());
  const [note, setNote] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Quick inline new category
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
    [categories, type]
  );

  useEffect(() => {
    if (!open) return;
    setError('');
    setShowNewCat(false);
    if (editingTx) {
      setType(editingTx.type);
      setRawDigits(String(Math.round(editingTx.amount)));
      setCategoryId(editingTx.category_id);
      setWalletId(editingTx.wallet_id);
      setToWalletId(editingTx.to_wallet_id ?? (wallets.find((w) => w.id !== editingTx.wallet_id)?.id || 0));
      setDate(editingTx.date);
      setNote(editingTx.note);
      setTags(editingTx.tags);
    } else {
      setType(defaultType);
      setRawDigits('');
      const firstWallet = wallets[0]?.id || 0;
      const secondWallet = wallets.find((w) => w.id !== firstWallet)?.id || firstWallet;
      setWalletId(firstWallet);
      setToWalletId(secondWallet);
      setDate(defaultDate || getTodayISO());
      setNote('');
      setTags('');
      const initialCat = categories.find((c) => c.type === (defaultType === 'income' ? 'income' : 'expense'));
      setCategoryId(initialCat?.id ?? null);
    }
  }, [open, editingTx, defaultDate, defaultType, wallets, categories]);

  // Keep valid category when switching between income and expense
  useEffect(() => {
    if (type === 'transfer') return;
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? null);
    }
  }, [type, filteredCategories, categoryId]);

  const numericAmount = Number(rawDigits || 0);

  const smartSuggestions = useMemo(() => {
    if (!rawDigits) return [50_000, 100_000, 200_000, 500_000];
    const base = Number(rawDigits);
    if (!Number.isFinite(base) || base <= 0) return [];
    if (base < 1000) {
      return [base * 1000, base * 10_000, base * 100_000, base * 1_000_000].filter((v) => v <= 999_000_000);
    }
    return [];
  }, [rawDigits]);

  if (!open) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
    setRawDigits(digits);
  };

  const handleMultiply = (factor: number) => {
    const base = Number(rawDigits || '1');
    const next = Math.min(999_999_999_999, base * factor);
    setRawDigits(String(next));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await api.createCategory({
        name: newCatName.trim(),
        type: type === 'income' ? 'income' : 'expense',
        icon: newCatIcon,
        color: newCatColor,
      });
      await onSaved();
      setCategoryId(created.id);
      setNewCatName('');
      setShowNewCat(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo danh mục');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Vui lòng nhập số tiền lớn hơn 0 ₫');
      return;
    }
    if (!walletId) {
      setError('Vui lòng chọn ví');
      return;
    }
    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) {
      setError('Ví nhận phải khác ví nguồn');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        amount: numericAmount,
        category_id: type === 'transfer' ? null : categoryId,
        wallet_id: walletId,
        to_wallet_id: type === 'transfer' ? toWalletId : null,
        date,
        note,
        tags,
      };
      if (editingTx) {
        await api.updateTransaction(editingTx.id, payload);
      } else {
        await api.createTransaction(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0E1525]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingTx ? 'Chỉnh sửa giao dịch' : 'Ghi giao dịch mới'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Type Switcher */}
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-white/5">
            {([
              { id: 'expense', label: 'Chi tiêu', activeCls: 'bg-rose-500 text-white shadow-md shadow-rose-500/25' },
              { id: 'income', label: 'Thu nhập', activeCls: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' },
              { id: 'transfer', label: 'Chuyển ví', activeCls: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id)}
                className={`rounded-xl py-2 text-xs sm:text-sm font-semibold transition ${
                  type === tab.id ? tab.activeCls : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Smart VND Input */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Số tiền (VNĐ)</span>
              {rawDigits && (
                <button
                  type="button"
                  onClick={() => setRawDigits('')}
                  className="text-rose-500 hover:underline"
                >
                  Xoá số
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={rawDigits ? new Intl.NumberFormat('vi-VN').format(Number(rawDigits)) : ''}
                onChange={handleAmountChange}
                className={`w-full bg-transparent font-mono-num text-3xl font-bold outline-none ${
                  type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : type === 'transfer'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-rose-600 dark:text-rose-400'
                }`}
              />
              <span className="font-mono-num text-lg font-semibold text-slate-400">₫</span>
            </div>

            {/* Quick multipliers + smart suggestions */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {smartSuggestions.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRawDigits(String(val))}
                  className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono-num text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  {formatVND(val)}
                </button>
              ))}
              {rawDigits && (
                <>
                  <button
                    type="button"
                    onClick={() => handleMultiply(1000)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono-num text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    +000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMultiply(10000)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono-num text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    ×10k
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Category grid (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Danh mục
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCat(!showNewCat)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showNewCat ? 'Đóng' : 'Thêm danh mục'}
                </button>
              </div>

              {showNewCat && (
                <div className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Tên danh mục mới..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-[#0A101E]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" /> Lưu
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`h-5 w-5 rounded-full transition ${newCatColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <span className="mx-1 text-slate-400">|</span>
                    {AVAILABLE_ICON_NAMES.slice(0, 8).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewCatIcon(ic)}
                        className={`rounded-lg p-1 ${newCatIcon === ic ? 'bg-emerald-500/20' : 'opacity-60 hover:opacity-100'}`}
                      >
                        <IconBadge icon={ic} color={newCatColor} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {filteredCategories.map((cat) => {
                  const selected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                      }`}
                    >
                      <IconBadge icon={cat.icon} color={cat.color} size="sm" />
                      <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wallets */}
          <div className={`grid gap-3 ${type === 'transfer' ? 'sm:grid-cols-[1fr_auto_1fr] items-end' : 'sm:grid-cols-2'}`}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {type === 'transfer' ? 'Từ ví' : 'Ví thanh toán'}
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance, true)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div className="hidden sm:flex h-10 items-center justify-center text-indigo-400">
                <ArrowRight className="h-5 w-5" />
              </div>
            )}

            {type === 'transfer' ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Đến ví
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
                >
                  {wallets
                    .filter((w) => w.id !== walletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatVND(w.balance, true)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ngày giao dịch
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {type === 'transfer' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ngày chuyển tiền
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
              />
            </div>
          )}

          {/* Note & Tags */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Cà phê sáng, Tiền nhà..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thẻ (Tags)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="VD: ăn-uống, cố-định"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0A101E] dark:text-slate-100"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-500">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : editingTx ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
