import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db, runInTransaction } from './db.js';
import { clearAllUserTransactions, reseedDemoData, seedDatabaseIfEmpty } from './seed.js';
import type {
  AnalyticsSummary,
  BootstrapPayload,
  BudgetItem,
  Category,
  CategoryBreakdownItem,
  DailySeriesPoint,
  MonthlySeriesPoint,
  SavingsGoal,
  SmartInsight,
  Transaction,
  TransactionType,
  Wallet,
} from '../src/types.js';

seedDatabaseIfEmpty(db);

const app = express();
const PORT = Number(process.env.PORT || 3456);

app.use(express.json({ limit: '5mb' }));

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonth(raw: unknown): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }
  return currentYearMonth();
}

function getPreviousMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastNMonths(ym: string, count: number): string[] {
  const [y, m] = ym.split('-').map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `T${m}/${String(y).slice(2)}`;
}

function applyWalletImpact(
  type: TransactionType,
  amount: number,
  walletId: number,
  toWalletId: number | null,
  sign: 1 | -1
): void {
  const stmt = db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?');
  if (type === 'income') {
    stmt.run(sign * amount, walletId);
  } else if (type === 'expense') {
    stmt.run(-sign * amount, walletId);
  } else if (type === 'transfer' && toWalletId !== null) {
    stmt.run(-sign * amount, walletId);
    stmt.run(sign * amount, toWalletId);
  }
}

function buildAnalytics(
  month: string,
  wallets: Wallet[],
  allTransactions: Transaction[],
  categories: Category[],
  budgets: BudgetItem[]
): AnalyticsSummary {
  const prevMonth = getPreviousMonth(month);
  const categoryMap = new Map<number, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  let monthIncome = 0;
  let monthExpense = 0;
  let prevMonthIncome = 0;
  let prevMonthExpense = 0;

  const dailyMap = new Map<string, { income: number; expense: number }>();
  const breakdownMap = new Map<number | null, { amount: number; count: number }>();

  for (const tx of allTransactions) {
    const txMonth = tx.date.slice(0, 7);
    if (txMonth === month) {
      if (tx.type === 'income') {
        monthIncome += tx.amount;
        const entry = dailyMap.get(tx.date) || { income: 0, expense: 0 };
        entry.income += tx.amount;
        dailyMap.set(tx.date, entry);
      } else if (tx.type === 'expense') {
        monthExpense += tx.amount;
        const entry = dailyMap.get(tx.date) || { income: 0, expense: 0 };
        entry.expense += tx.amount;
        dailyMap.set(tx.date, entry);

        const prevCat = breakdownMap.get(tx.category_id) || { amount: 0, count: 0 };
        prevCat.amount += tx.amount;
        prevCat.count += 1;
        breakdownMap.set(tx.category_id, prevCat);
      }
    } else if (txMonth === prevMonth) {
      if (tx.type === 'income') prevMonthIncome += tx.amount;
      else if (tx.type === 'expense') prevMonthExpense += tx.amount;
    }
  }

  const netCashflow = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0;
  const incomeChangePct =
    prevMonthIncome > 0 ? Math.round(((monthIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;
  const expenseChangePct =
    prevMonthExpense > 0 ? Math.round(((monthExpense - prevMonthExpense) / prevMonthExpense) * 100) : null;
  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);

  // Daily series for every day in selected month
  const [yr, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const dailySeries: DailySeriesPoint[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const bucket = dailyMap.get(dateStr) || { income: 0, expense: 0 };
    dailySeries.push({
      date: dateStr,
      dayLabel: String(d),
      income: bucket.income,
      expense: bucket.expense,
    });
  }

  // Monthly 6-month trend
  const last6 = getLastNMonths(month, 6);
  const monthlyBuckets = new Map<string, { income: number; expense: number }>();
  for (const m of last6) monthlyBuckets.set(m, { income: 0, expense: 0 });
  for (const tx of allTransactions) {
    const m = tx.date.slice(0, 7);
    const b = monthlyBuckets.get(m);
    if (!b) continue;
    if (tx.type === 'income') b.income += tx.amount;
    else if (tx.type === 'expense') b.expense += tx.amount;
  }
  const monthlySeries: MonthlySeriesPoint[] = last6.map((m) => {
    const b = monthlyBuckets.get(m)!;
    return {
      month: m,
      label: formatMonthLabel(m),
      income: b.income,
      expense: b.expense,
      net: b.income - b.expense,
    };
  });

  // Category breakdown
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(breakdownMap.entries())
    .map(([categoryId, data]) => {
      const cat = categoryId ? categoryMap.get(categoryId) : undefined;
      return {
        categoryId,
        name: cat?.name || 'Khác',
        color: cat?.color || '#64748B',
        icon: cat?.icon || 'Tag',
        amount: data.amount,
        percentage: monthExpense > 0 ? Math.round((data.amount / monthExpense) * 1000) / 10 : 0,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Average & projected monthly expense
  const now = new Date();
  const isCurrentMonth = month === currentYearMonth();
  const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  const avgDailyExpense = Math.round(monthExpense / elapsedDays);
  const projectedMonthExpense = isCurrentMonth ? Math.round(avgDailyExpense * daysInMonth) : monthExpense;

  // Financial health score 0-100
  let healthScore = 50;
  if (monthIncome > 0) {
    healthScore = Math.max(10, Math.min(100, Math.round(50 + savingsRate * 1.1)));
  } else if (monthExpense === 0) {
    healthScore = 75;
  }
  const overBudgets = budgets.filter((b) => b.spent > b.amount);
  const nearBudgets = budgets.filter((b) => b.spent <= b.amount && b.spent >= b.amount * 0.85);
  healthScore = Math.max(5, healthScore - overBudgets.length * 8);

  // Smart Vietnamese insights
  const insights: SmartInsight[] = [];

  if (monthIncome > 0) {
    if (savingsRate >= 25) {
      insights.push({
        id: 'savings-great',
        tone: 'positive',
        title: `Tỷ lệ tích luỹ đạt ${savingsRate}% thu nhập`,
        description: `Dòng tiền ròng tháng này dương ${(netCashflow / 1_000_000).toFixed(1)} triệu ₫, vượt chuẩn an toàn tài chính (20%).`,
      });
    } else if (savingsRate >= 0) {
      insights.push({
        id: 'savings-ok',
        tone: 'info',
        title: `Tỷ lệ tích luỹ đang ở mức ${savingsRate}%`,
        description: `Bạn đang giữ lại được ${Math.max(0, netCashflow).toLocaleString('vi-VN')} ₫ trong tháng. Cố gắng hướng tới mốc 20%.`,
      });
    } else {
      insights.push({
        id: 'savings-neg',
        tone: 'danger',
        title: 'Chi tiêu đang vượt quá thu nhập tháng',
        description: `Thâm hụt ${Math.abs(netCashflow).toLocaleString('vi-VN')} ₫. Hãy rà soát lại các khoản chi lớn trong tháng.`,
      });
    }
  }

  if (overBudgets.length > 0) {
    const names = overBudgets.map((b) => b.category_name).slice(0, 2).join(', ');
    insights.push({
      id: 'budget-over',
      tone: 'danger',
      title: `${overBudgets.length} danh mục đã vượt hạn mức ngân sách`,
      description: `Cảnh báo vượt định mức tại: ${names}. Cân nhắc điều chỉnh chi tiêu phần còn lại của tháng.`,
    });
  } else if (nearBudgets.length > 0) {
    insights.push({
      id: 'budget-near',
      tone: 'warning',
      title: `${nearBudgets[0].category_name} sắp chạm ngưỡng ngân sách`,
      description: `Đã sử dụng ${Math.round((nearBudgets[0].spent / nearBudgets[0].amount) * 100)}% hạn mức đặt ra cho tháng ${month}.`,
    });
  } else if (budgets.length > 0 && monthExpense > 0) {
    insights.push({
      id: 'budget-safe',
      tone: 'positive',
      title: 'Tất cả ngân sách đều trong vùng kiểm soát',
      description: `Cả ${budgets.length} danh mục có đặt hạn mức đều chưa vượt quá kế hoạch chi tiêu tháng.`,
    });
  }

  if (categoryBreakdown.length > 0) {
    const top = categoryBreakdown[0];
    insights.push({
      id: 'top-cat',
      tone: 'info',
      title: `"${top.name}" chiếm tỷ trọng chi cao nhất (${top.percentage}%)`,
      description: `Tổng ${top.amount.toLocaleString('vi-VN')} ₫ qua ${top.count} giao dịch. Trung bình mỗi ngày chi ${avgDailyExpense.toLocaleString('vi-VN')} ₫.`,
    });
  }

  return {
    monthIncome,
    monthExpense,
    netCashflow,
    savingsRate,
    prevMonthIncome,
    prevMonthExpense,
    incomeChangePct,
    expenseChangePct,
    totalBalance,
    avgDailyExpense,
    projectedMonthExpense,
    healthScore,
    dailySeries,
    monthlySeries,
    categoryBreakdown,
    insights,
  };
}

function getBootstrap(month: string): BootstrapPayload {
  const wallets = db.prepare('SELECT * FROM wallets ORDER BY id ASC').all() as unknown as Wallet[];
  const categories = db.prepare('SELECT * FROM categories ORDER BY type ASC, id ASC').all() as unknown as Category[];
  const transactions = db
    .prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC')
    .all() as unknown as Transaction[];

  const budgets = db
    .prepare(
      `SELECT
         b.id,
         b.category_id,
         b.month,
         b.amount,
         c.name AS category_name,
         c.color AS category_color,
         c.icon AS category_icon,
         COALESCE(
           (SELECT SUM(t.amount)
            FROM transactions t
            WHERE t.type = 'expense'
              AND t.category_id = b.category_id
              AND substr(t.date, 1, 7) = b.month),
           0
         ) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.month = ?
       ORDER BY (spent * 1.0 / b.amount) DESC, b.amount DESC`
    )
    .all(month) as unknown as BudgetItem[];

  const savingsGoals = db
    .prepare('SELECT * FROM savings_goals ORDER BY id ASC')
    .all() as unknown as SavingsGoal[];

  const analytics = buildAnalytics(month, wallets, transactions, categories, budgets);

  return {
    month,
    wallets,
    categories,
    transactions,
    budgets,
    savingsGoals,
    analytics,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: 'node:sqlite', timestamp: new Date().toISOString() });
});

app.get('/api/bootstrap', (req, res) => {
  const month = normalizeMonth(req.query.month);
  res.json(getBootstrap(month));
});

// Transactions CRUD
app.post('/api/transactions', (req, res) => {
  const { type, amount, category_id, wallet_id, to_wallet_id, note, tags, date } = req.body ?? {};
  const numAmount = Number(amount);
  const wId = Number(wallet_id);
  const toWId = to_wallet_id !== null && to_wallet_id !== undefined && to_wallet_id !== '' ? Number(to_wallet_id) : null;
  const catId = category_id !== null && category_id !== undefined && category_id !== '' ? Number(category_id) : null;

  if (!['income', 'expense', 'transfer'].includes(type)) {
    res.status(400).json({ error: 'Loại giao dịch không hợp lệ' });
    return;
  }
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
    return;
  }
  if (!Number.isInteger(wId) || wId <= 0) {
    res.status(400).json({ error: 'Vui lòng chọn ví hợp lệ' });
    return;
  }
  if (type === 'transfer') {
    if (!toWId || toWId === wId) {
      res.status(400).json({ error: 'Ví nhận phải khác ví chuyển' });
      return;
    }
  }
  const safeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const created = runInTransaction(() => {
    const stmt = db.prepare(
      `INSERT INTO transactions (type, amount, category_id, wallet_id, to_wallet_id, note, tags, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      type,
      numAmount,
      type === 'transfer' ? null : catId,
      wId,
      type === 'transfer' ? toWId : null,
      String(note ?? '').trim(),
      String(tags ?? '').trim(),
      safeDate,
      nowIso
    );
    applyWalletImpact(type, numAmount, wId, type === 'transfer' ? toWId : null, 1);
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(info.lastInsertRowid));
  });

  res.status(201).json(created);
});

app.put('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as unknown as Transaction | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy giao dịch' });
    return;
  }

  const { type, amount, category_id, wallet_id, to_wallet_id, note, tags, date } = req.body ?? {};
  const numAmount = Number(amount);
  const wId = Number(wallet_id);
  const toWId = to_wallet_id !== null && to_wallet_id !== undefined && to_wallet_id !== '' ? Number(to_wallet_id) : null;
  const catId = category_id !== null && category_id !== undefined && category_id !== '' ? Number(category_id) : null;

  if (!['income', 'expense', 'transfer'].includes(type) || !Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Dữ liệu giao dịch không hợp lệ' });
    return;
  }
  if (type === 'transfer' && (!toWId || toWId === wId)) {
    res.status(400).json({ error: 'Ví nhận phải khác ví chuyển' });
    return;
  }
  const safeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : existing.date;

  const updated = runInTransaction(() => {
    // Reverse old impact
    applyWalletImpact(existing.type, existing.amount, existing.wallet_id, existing.to_wallet_id, -1);

    db.prepare(
      `UPDATE transactions
       SET type = ?, amount = ?, category_id = ?, wallet_id = ?, to_wallet_id = ?, note = ?, tags = ?, date = ?
       WHERE id = ?`
    ).run(
      type,
      numAmount,
      type === 'transfer' ? null : catId,
      wId,
      type === 'transfer' ? toWId : null,
      String(note ?? '').trim(),
      String(tags ?? '').trim(),
      safeDate,
      id
    );

    // Apply new impact
    applyWalletImpact(type, numAmount, wId, type === 'transfer' ? toWId : null, 1);
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  });

  res.json(updated);
});

app.delete('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as unknown as Transaction | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy giao dịch' });
    return;
  }

  runInTransaction(() => {
    applyWalletImpact(existing.type, existing.amount, existing.wallet_id, existing.to_wallet_id, -1);
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  });

  res.json({ ok: true });
});

// Wallets CRUD
app.post('/api/wallets', (req, res) => {
  const { name, type, balance, color, icon } = req.body ?? {};
  if (!String(name ?? '').trim()) {
    res.status(400).json({ error: 'Tên ví không được để trống' });
    return;
  }
  const safeType = ['cash', 'bank', 'ewallet', 'credit', 'investment'].includes(type) ? type : 'bank';
  const numBalance = Number(balance ?? 0);
  const info = db
    .prepare('INSERT INTO wallets (name, type, balance, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      String(name).trim(),
      safeType,
      Number.isFinite(numBalance) ? numBalance : 0,
      String(color || '#10B981'),
      String(icon || 'Wallet'),
      new Date().toISOString()
    );
  res.status(201).json(db.prepare('SELECT * FROM wallets WHERE id = ?').get(Number(info.lastInsertRowid)));
});

app.put('/api/wallets/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id) as unknown as Wallet | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy ví' });
    return;
  }
  const { name, type, balance, color, icon } = req.body ?? {};
  const safeType = ['cash', 'bank', 'ewallet', 'credit', 'investment'].includes(type) ? type : existing.type;
  const numBalance = balance !== undefined ? Number(balance) : existing.balance;

  db.prepare('UPDATE wallets SET name = ?, type = ?, balance = ?, color = ?, icon = ? WHERE id = ?').run(
    String(name ?? existing.name).trim() || existing.name,
    safeType,
    Number.isFinite(numBalance) ? numBalance : existing.balance,
    String(color ?? existing.color),
    String(icon ?? existing.icon),
    id
  );
  res.json(db.prepare('SELECT * FROM wallets WHERE id = ?').get(id));
});

app.delete('/api/wallets/:id', (req, res) => {
  const id = Number(req.params.id);
  const count = (db.prepare('SELECT COUNT(*) AS count FROM wallets').get() as { count: number }).count;
  if (count <= 1) {
    res.status(400).json({ error: 'Cần giữ lại ít nhất 1 ví trong hệ thống' });
    return;
  }
  db.prepare('DELETE FROM wallets WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Categories
app.post('/api/categories', (req, res) => {
  const { name, type, color, icon } = req.body ?? {};
  if (!String(name ?? '').trim() || !['income', 'expense'].includes(type)) {
    res.status(400).json({ error: 'Tên hoặc loại danh mục không hợp lệ' });
    return;
  }
  const info = db
    .prepare('INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), type, String(color || '#10B981'), String(icon || 'Tag'));
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(info.lastInsertRowid)));
});

// Budgets
app.post('/api/budgets', (req, res) => {
  const { category_id, month, amount } = req.body ?? {};
  const catId = Number(category_id);
  const numAmount = Number(amount);
  const safeMonth = normalizeMonth(month);

  if (!Number.isInteger(catId) || !Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Thông tin ngân sách không hợp lệ' });
    return;
  }

  db.prepare(
    `INSERT INTO budgets (category_id, month, amount)
     VALUES (?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET amount = excluded.amount`
  ).run(catId, safeMonth, numAmount);

  res.status(201).json({ ok: true });
});

app.delete('/api/budgets/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Savings Goals
app.post('/api/goals', (req, res) => {
  const { name, target_amount, current_amount, color, icon, deadline } = req.body ?? {};
  const target = Number(target_amount);
  const current = Number(current_amount ?? 0);
  if (!String(name ?? '').trim() || !Number.isFinite(target) || target <= 0) {
    res.status(400).json({ error: 'Tên mục tiêu và số tiền đích phải hợp lệ' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO savings_goals (name, target_amount, current_amount, color, icon, deadline, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(name).trim(),
      target,
      Number.isFinite(current) && current >= 0 ? current : 0,
      String(color || '#10B981'),
      String(icon || 'Target'),
      deadline ? String(deadline) : null,
      new Date().toISOString()
    );
  res.status(201).json(db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(Number(info.lastInsertRowid)));
});

app.post('/api/goals/:id/contribute', (req, res) => {
  const id = Number(req.params.id);
  const { amount, wallet_id } = req.body ?? {};
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Số tiền nạp phải lớn hơn 0' });
    return;
  }
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as unknown as SavingsGoal | undefined;
  if (!goal) {
    res.status(404).json({ error: 'Không tìm thấy hũ tiết kiệm' });
    return;
  }

  const updated = runInTransaction(() => {
    db.prepare('UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?').run(numAmount, id);
    if (wallet_id !== null && wallet_id !== undefined && wallet_id !== '') {
      const wId = Number(wallet_id);
      if (Number.isInteger(wId) && wId > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        db.prepare(
          `INSERT INTO transactions (type, amount, category_id, wallet_id, to_wallet_id, note, tags, date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          'expense',
          numAmount,
          null,
          wId,
          null,
          `Nạp vào hũ: ${goal.name}`,
          'tích-luỹ',
          todayStr,
          new Date().toISOString()
        );
        db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(numAmount, wId);
      }
    }
    return db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
  });

  res.json(updated);
});

app.delete('/api/goals/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Export CSV (UTF-8 BOM for Vietnamese Excel compatibility)
app.get('/api/export/csv', (req, res) => {
  const monthFilter = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : null;

  const rows = db
    .prepare(
      `SELECT
         t.date,
         t.type,
         t.amount,
         c.name AS category_name,
         w.name AS wallet_name,
         tw.name AS to_wallet_name,
         t.note,
         t.tags
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN wallets w ON w.id = t.wallet_id
       LEFT JOIN wallets tw ON tw.id = t.to_wallet_id
       ${monthFilter ? "WHERE substr(t.date, 1, 7) = ?" : ''}
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(...(monthFilter ? [monthFilter] : [])) as Array<{
      date: string;
      type: string;
      amount: number;
      category_name: string | null;
      wallet_name: string | null;
      to_wallet_name: string | null;
      note: string;
      tags: string;
    }>;

  const esc = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const typeVi = (t: string) => (t === 'income' ? 'Thu nhập' : t === 'expense' ? 'Chi tiêu' : 'Chuyển ví');
  const header = ['Ngày', 'Loại', 'Số tiền (VND)', 'Danh mục', 'Ví nguồn', 'Ví đích', 'Ghi chú', 'Thẻ'].map(esc).join(',');
  const lines = rows.map((r) =>
    [
      r.date,
      typeVi(r.type),
      r.amount,
      r.category_name || (r.type === 'transfer' ? 'Chuyển ví' : 'Khác'),
      r.wallet_name || '',
      r.to_wallet_name || '',
      r.note,
      r.tags,
    ]
      .map(esc)
      .join(',')
  );

  const csvBody = '\uFEFF' + [header, ...lines].join('\r\n');
  const filename = monthFilter ? `finvault-${monthFilter}.csv` : 'finvault-tat-ca.csv';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvBody);
});

// Export / Import JSON backup
app.get('/api/export/json', (_req, res) => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    wallets: db.prepare('SELECT * FROM wallets ORDER BY id ASC').all(),
    categories: db.prepare('SELECT * FROM categories ORDER BY id ASC').all(),
    transactions: db.prepare('SELECT * FROM transactions ORDER BY id ASC').all(),
    budgets: db.prepare('SELECT * FROM budgets ORDER BY id ASC').all(),
    savings_goals: db.prepare('SELECT * FROM savings_goals ORDER BY id ASC').all(),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="finvault-backup.json"');
  res.json(payload);
});

app.post('/api/import/json', (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.wallets) || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    res.status(400).json({ error: 'File sao lưu JSON không đúng định dạng FinVault' });
    return;
  }

  runInTransaction(() => {
    db.exec(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM savings_goals;
      DELETE FROM categories;
      DELETE FROM wallets;
    `);

    const insWallet = db.prepare(
      'INSERT INTO wallets (id, name, type, balance, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const w of data.wallets) {
      insWallet.run(
        w.id ?? null,
        String(w.name),
        String(w.type || 'bank'),
        Number(w.balance || 0),
        String(w.color || '#10B981'),
        String(w.icon || 'Wallet'),
        String(w.created_at || new Date().toISOString())
      );
    }

    const insCat = db.prepare('INSERT INTO categories (id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)');
    for (const c of data.categories) {
      insCat.run(c.id ?? null, String(c.name), String(c.type || 'expense'), String(c.color || '#64748B'), String(c.icon || 'Tag'));
    }

    const insTx = db.prepare(
      `INSERT INTO transactions (id, type, amount, category_id, wallet_id, to_wallet_id, note, tags, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of data.transactions) {
      insTx.run(
        t.id ?? null,
        String(t.type),
        Number(t.amount),
        t.category_id ?? null,
        Number(t.wallet_id),
        t.to_wallet_id ?? null,
        String(t.note ?? ''),
        String(t.tags ?? ''),
        String(t.date),
        String(t.created_at || new Date().toISOString())
      );
    }

    if (Array.isArray(data.budgets)) {
      const insBudget = db.prepare('INSERT INTO budgets (id, category_id, month, amount) VALUES (?, ?, ?, ?)');
      for (const b of data.budgets) {
        insBudget.run(b.id ?? null, Number(b.category_id), String(b.month), Number(b.amount));
      }
    }

    if (Array.isArray(data.savings_goals)) {
      const insGoal = db.prepare(
        `INSERT INTO savings_goals (id, name, target_amount, current_amount, color, icon, deadline, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const g of data.savings_goals) {
        insGoal.run(
          g.id ?? null,
          String(g.name),
          Number(g.target_amount),
          Number(g.current_amount || 0),
          String(g.color || '#10B981'),
          String(g.icon || 'Target'),
          g.deadline ?? null,
          String(g.created_at || new Date().toISOString())
        );
      }
    }
  });

  res.json({ ok: true });
});

app.post('/api/demo/clear', (_req, res) => {
  clearAllUserTransactions(db);
  res.json({ ok: true });
});

app.post('/api/demo/seed', (_req, res) => {
  reseedDemoData(db);
  res.json({ ok: true });
});

// Serve built SPA in production (Express 5 safe fallback — no bare '*')
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`FinVault server listening at http://localhost:${PORT}`);
});
