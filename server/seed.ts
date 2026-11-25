import type { DatabaseSync } from 'node:sqlite';
import { runInTransaction } from './db.js';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(year: number, monthIndex0: number, day: number): string {
  const maxDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(safeDay)}`;
}

function getMonthString(year: number, monthIndex0: number): string {
  return `${year}-${pad2(monthIndex0 + 1)}`;
}

function shiftMonth(baseDate: Date, offsetMonths: number): { year: number; monthIndex0: number; ym: string } {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offsetMonths, 1);
  return {
    year: d.getFullYear(),
    monthIndex0: d.getMonth(),
    ym: getMonthString(d.getFullYear(), d.getMonth()),
  };
}

function insertDefaultWalletsAndCategories(database: DatabaseSync, initialZeroBalances = false): {
  walletIds: Record<string, number>;
  categoryIds: Record<string, number>;
} {
  const nowIso = new Date().toISOString();

  const walletsData = [
    { name: 'Tiền mặt', type: 'cash', balance: initialZeroBalances ? 0 : 3500000, color: '#10B981', icon: 'Wallet' },
    { name: 'Techcombank', type: 'bank', balance: initialZeroBalances ? 0 : 25000000, color: '#3B82F6', icon: 'Landmark' },
    { name: 'Ví MoMo', type: 'ewallet', balance: initialZeroBalances ? 0 : 4200000, color: '#EC4899', icon: 'Smartphone' },
    { name: 'Quỹ Đầu tư & Tiết kiệm', type: 'investment', balance: initialZeroBalances ? 0 : 42000000, color: '#8B5CF6', icon: 'TrendingUp' },
  ];

  const insertWallet = database.prepare(
    'INSERT INTO wallets (name, type, balance, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const walletIds: Record<string, number> = {};
  for (const w of walletsData) {
    const res = insertWallet.run(w.name, w.type, w.balance, w.color, w.icon, nowIso);
    walletIds[w.name] = Number(res.lastInsertRowid);
  }

  const categoriesData = [
    // Expense
    { name: 'Ăn uống', type: 'expense', color: '#F97316', icon: 'Utensils' },
    { name: 'Di chuyển', type: 'expense', color: '#06B6D4', icon: 'Car' },
    { name: 'Mua sắm', type: 'expense', color: '#EC4899', icon: 'ShoppingBag' },
    { name: 'Hoá đơn & Nhà ở', type: 'expense', color: '#6366F1', icon: 'Home' },
    { name: 'Giải trí', type: 'expense', color: '#A855F7', icon: 'Gamepad2' },
    { name: 'Sức khoẻ', type: 'expense', color: '#EF4444', icon: 'HeartPulse' },
    { name: 'Giáo dục', type: 'expense', color: '#0EA5E9', icon: 'GraduationCap' },
    { name: 'Hiếu hỉ & Quà tặng', type: 'expense', color: '#F59E0B', icon: 'Gift' },
    // Income
    { name: 'Lương chính', type: 'income', color: '#10B981', icon: 'Briefcase' },
    { name: 'Thưởng & Dự án', type: 'income', color: '#14B8A6', icon: 'Sparkles' },
    { name: 'Đầu tư sinh lời', type: 'income', color: '#8B5CF6', icon: 'TrendingUp' },
    { name: 'Thu nhập khác', type: 'income', color: '#22C55E', icon: 'PiggyBank' },
  ];

  const insertCategory = database.prepare(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)'
  );
  const categoryIds: Record<string, number> = {};
  for (const c of categoriesData) {
    const res = insertCategory.run(c.name, c.type, c.color, c.icon);
    categoryIds[c.name] = Number(res.lastInsertRowid);
  }

  return { walletIds, categoryIds };
}

export function seedDatabaseIfEmpty(database: DatabaseSync): void {
  const row = database.prepare('SELECT COUNT(*) AS count FROM wallets').get() as { count: number };
  if (row && row.count > 0) {
    return;
  }
  reseedDemoData(database);
}

export function reseedDemoData(database: DatabaseSync): void {
  runInTransaction(() => {
    database.exec(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM savings_goals;
      DELETE FROM categories;
      DELETE FROM wallets;
    `);

    const { walletIds, categoryIds } = insertDefaultWalletsAndCategories(database, false);

    const today = new Date();
    const curDay = today.getDate();
    const m0 = shiftMonth(today, 0);
    const m1 = shiftMonth(today, -1);
    const m2 = shiftMonth(today, -2);
    const m3 = shiftMonth(today, -3);

    const insertTx = database.prepare(
      `INSERT INTO transactions (type, amount, category_id, wallet_id, to_wallet_id, note, tags, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const updateWalletBal = database.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?');

    const recordTx = (
      type: 'income' | 'expense' | 'transfer',
      amount: number,
      categoryName: string | null,
      walletName: string,
      toWalletName: string | null,
      note: string,
      tags: string,
      dateStr: string
    ) => {
      const catId = categoryName ? (categoryIds[categoryName] ?? null) : null;
      const wId = walletIds[walletName];
      const toWId = toWalletName ? (walletIds[toWalletName] ?? null) : null;
      insertTx.run(type, amount, catId, wId, toWId, note, tags, dateStr, `${dateStr}T09:30:00.000Z`);

      if (type === 'income') {
        updateWalletBal.run(amount, wId);
      } else if (type === 'expense') {
        updateWalletBal.run(-amount, wId);
      } else if (type === 'transfer' && toWId) {
        updateWalletBal.run(-amount, wId);
        updateWalletBal.run(amount, toWId);
      }
    };

    // Previous 3 months realistic history
    const pastMonths = [
      { info: m3, salary: 28000000, bonus: 3500000, rent: 6500000, foodFactor: 0.92 },
      { info: m2, salary: 28000000, bonus: 5200000, rent: 6500000, foodFactor: 1.05 },
      { info: m1, salary: 30000000, bonus: 4500000, rent: 6800000, foodFactor: 1.0 },
    ];

    for (const pm of pastMonths) {
      const { year, monthIndex0 } = pm.info;
      recordTx('income', pm.salary, 'Lương chính', 'Techcombank', null, 'Lương tháng công ty', 'lương,cố-định', formatDate(year, monthIndex0, 5));
      recordTx('income', pm.bonus, 'Thưởng & Dự án', 'Techcombank', null, 'Thù lao dự án freelance', 'freelance', formatDate(year, monthIndex0, 18));
      recordTx('income', 1450000, 'Đầu tư sinh lời', 'Quỹ Đầu tư & Tiết kiệm', null, 'Cổ tức & lãi tiết kiệm', 'đầu-tư', formatDate(year, monthIndex0, 22));
      recordTx('expense', pm.rent, 'Hoá đơn & Nhà ở', 'Techcombank', null, 'Tiền thuê nhà + điện nước', 'nhà-ở,cố-định', formatDate(year, monthIndex0, 6));
      recordTx('expense', Math.round(3800000 * pm.foodFactor), 'Ăn uống', 'Ví MoMo', null, 'Ăn uống & cà phê tháng', 'ăn-uống', formatDate(year, monthIndex0, 12));
      recordTx('expense', Math.round(2400000 * pm.foodFactor), 'Ăn uống', 'Tiền mặt', null, 'Đi chợ & siêu thị WinMart', 'siêu-thị', formatDate(year, monthIndex0, 24));
      recordTx('expense', 1250000, 'Di chuyển', 'Ví MoMo', null, 'Xăng xe & Grab đi làm', 'di-chuyển', formatDate(year, monthIndex0, 14));
      recordTx('expense', 2600000, 'Mua sắm', 'Techcombank', null, 'Đồ gia dụng & quần áo', 'mua-sắm', formatDate(year, monthIndex0, 19));
      recordTx('expense', 950000, 'Giải trí', 'Ví MoMo', null, 'Xem phim CGV & Spotify', 'giải-trí', formatDate(year, monthIndex0, 21));
      recordTx('expense', 850000, 'Giáo dục', 'Techcombank', null, 'Sách chuyên môn & khoá học', 'học-tập', formatDate(year, monthIndex0, 16));
      recordTx('transfer', 3000000, null, 'Techcombank', 'Tiền mặt', 'Rút tiền mặt chi tiêu tháng', 'rút-tiền', formatDate(year, monthIndex0, 6));
      recordTx('transfer', 6500000, null, 'Techcombank', 'Ví MoMo', 'Nạp ví MoMo thanh toán', 'chuyển-ví', formatDate(year, monthIndex0, 6));
      recordTx('transfer', 6000000, null, 'Techcombank', 'Quỹ Đầu tư & Tiết kiệm', 'Tích luỹ quỹ tự do tài chính', 'tiết-kiệm', formatDate(year, monthIndex0, 7));
    }

    // Current month (anchored cleanly up to today's day so charts and heatmap shine)
    const dCap = (targetDay: number) => Math.max(1, Math.min(targetDay, curDay));

    recordTx('income', 32000000, 'Lương chính', 'Techcombank', null, 'Nhận lương tháng hiện tại', 'lương,cố-định', formatDate(m0.year, m0.monthIndex0, dCap(5)));
    if (curDay >= 10) {
      recordTx('income', 6500000, 'Thưởng & Dự án', 'Techcombank', null, 'Hoàn thành milestone app Web', 'freelance,thưởng', formatDate(m0.year, m0.monthIndex0, dCap(12)));
    }
    if (curDay >= 15) {
      recordTx('income', 1850000, 'Đầu tư sinh lời', 'Quỹ Đầu tư & Tiết kiệm', null, 'Lãi chứng chỉ quỹ tháng này', 'đầu-tư', formatDate(m0.year, m0.monthIndex0, dCap(18)));
    }

    recordTx('transfer', 2000000, null, 'Techcombank', 'Ví MoMo', 'Nạp tiền vào ví MoMo chi tiêu', 'chuyển-ví', formatDate(m0.year, m0.monthIndex0, dCap(2)));
    recordTx('transfer', 7000000, null, 'Techcombank', 'Quỹ Đầu tư & Tiết kiệm', 'Chuyển tiết kiệm tự động 20%', 'tiết-kiệm', formatDate(m0.year, m0.monthIndex0, dCap(6)));

    const currentExpenses: Array<[number, number, string, string, string, string]> = [
      [1, 65000, 'Ăn uống', 'Tiền mặt', 'Cà phê muối & bánh mì sáng', 'cà-phê,sáng'],
      [3, 420000, 'Ăn uống', 'Ví MoMo', 'Ăn trưa team tại Phở Thìn', 'ăn-uống'],
      [4, 6800000, 'Hoá đơn & Nhà ở', 'Techcombank', 'Tiền thuê căn hộ + dịch vụ', 'nhà-ở,cố-định'],
      [7, 940000, 'Hoá đơn & Nhà ở', 'Ví MoMo', 'Tiền điện, nước & Internet FPT', 'hóa-đơn'],
      [8, 185000, 'Di chuyển', 'Ví MoMo', 'Đổ xăng & gửi xe tuần', 'xăng-xe'],
      [9, 1350000, 'Ăn uống', 'Techcombank', 'Đi siêu thị AEON mua thực phẩm tuần', 'siêu-thị'],
      [11, 450000, 'Giải trí', 'Ví MoMo', 'Vé xem phim IMAX + bắp nước', 'giải-trí'],
      [13, 2450000, 'Mua sắm', 'Techcombank', 'Mua giày chạy bộ & phụ kiện', 'mua-sắm,thể-thao'],
      [14, 620000, 'Sức khoẻ', 'Techcombank', 'Khám răng định kỳ & vitamin', 'sức-khỏe'],
      [16, 1200000, 'Giáo dục', 'Techcombank', 'Gia hạn gói học tiếng Anh & sách', 'học-tập'],
      [17, 310000, 'Di chuyển', 'Ví MoMo', 'GrabCar đi gặp đối tác', 'di-chuyển'],
      [19, 890000, 'Ăn uống', 'Ví MoMo', 'Lẩu Thái cuối tuần cùng bạn bè', 'ăn-uống,bạn-bè'],
      [20, 1000000, 'Hiếu hỉ & Quà tặng', 'Tiền mặt', 'Mừng sinh nhật & thiệp chúc mừng', 'quà-tặng'],
      [22, 540000, 'Mua sắm', 'Ví MoMo', 'Đặt đồ gia dụng Shopee', 'shopee'],
      [23, 165000, 'Ăn uống', 'Tiền mặt', 'Bún chả & trà đá trưa', 'ăn-trưa'],
      [curDay, 95000, 'Ăn uống', 'Ví MoMo', 'Trà sữa & bánh ngọt chiều', 'đồ-uống'],
    ];

    const usedDays = new Set<string>();
    for (const [targetDay, amt, cat, wallet, note, tags] of currentExpenses) {
      if (targetDay > curDay && targetDay !== curDay) continue;
      const dStr = formatDate(m0.year, m0.monthIndex0, targetDay);
      usedDays.add(dStr);
      recordTx('expense', amt, cat, wallet, null, note, tags, dStr);
    }

    // Always ensure today has at least 1 transaction if curDay wasn't covered
    const todayStr = formatDate(m0.year, m0.monthIndex0, curDay);
    if (!usedDays.has(todayStr)) {
      recordTx('expense', 75000, 'Ăn uống', 'Tiền mặt', null, 'Cà phê sáng & ăn nhẹ', 'cà-phê', todayStr);
    }

    // Seed Budgets for current month and previous month
    const insertBudget = database.prepare(
      'INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)'
    );
    const budgetPlans: Array<[string, number]> = [
      ['Ăn uống', 5000000],
      ['Hoá đơn & Nhà ở', 8200000],
      ['Di chuyển', 1500000],
      ['Mua sắm', 3000000],
      ['Giải trí', 1200000],
      ['Sức khoẻ', 1000000],
      ['Giáo dục', 1500000],
    ];
    for (const [catName, amt] of budgetPlans) {
      const catId = categoryIds[catName];
      if (catId) {
        insertBudget.run(catId, m0.ym, amt);
        insertBudget.run(catId, m1.ym, amt);
      }
    }

    // Seed Savings Goals
    const insertGoal = database.prepare(
      `INSERT INTO savings_goals (name, target_amount, current_amount, color, icon, deadline, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const nowIso = new Date().toISOString();
    const nextYear = today.getFullYear() + 1;
    insertGoal.run('Quỹ dự phòng 6 tháng', 120000000, 74500000, '#10B981', 'ShieldCheck', `${nextYear}-12-31`, nowIso);
    insertGoal.run('Du lịch Nhật Bản mùa hoa', 45000000, 26800000, '#EC4899', 'Plane', `${nextYear}-04-15`, nowIso);
    insertGoal.run('Nâng cấp MacBook Pro M5', 52000000, 19000000, '#6366F1', 'Laptop', `${nextYear}-08-01`, nowIso);
  });
}

export function clearAllUserTransactions(database: DatabaseSync): void {
  runInTransaction(() => {
    database.exec(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM savings_goals;
      DELETE FROM categories;
      DELETE FROM wallets;
    `);
    insertDefaultWalletsAndCategories(database, true);
  });
}
