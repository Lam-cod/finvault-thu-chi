export function formatVND(amount: number, compact = false): string {
  const value = Number.isFinite(amount) ? amount : 0;
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
      return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} Tỷ`;
    }
    if (abs >= 1_000_000) {
      return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')} Tr`;
    }
    if (abs >= 1_000) {
      return `${sign}${Math.round(abs / 1_000)}k`;
    }
    return `${sign}${Math.round(abs)} ₫`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;
}

export function formatMonthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `Tháng ${m}, ${y}`;
}

export function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentYearMonth(): string {
  return getTodayISO().slice(0, 7);
}

export function formatVietnameseDateHeading(isoDate: string): string {
  const today = getTodayISO();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(
    yesterdayDate.getDate()
  ).padStart(2, '0')}`;

  if (isoDate === today) return 'Hôm nay';
  if (isoDate === yesterday) return 'Hôm qua';

  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${weekdays[dt.getDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export const WALLET_TYPE_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
  credit: 'Thẻ tín dụng',
  investment: 'Đầu tư & Tiết kiệm',
};
