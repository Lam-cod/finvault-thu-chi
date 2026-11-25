export type WalletType = 'cash' | 'bank' | 'ewallet' | 'credit' | 'investment';
export type CategoryType = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Wallet {
  id: number;
  name: string;
  type: WalletType;
  balance: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  wallet_id: number;
  to_wallet_id: number | null;
  note: string;
  tags: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface BudgetItem {
  id: number;
  category_id: number;
  month: string; // YYYY-MM
  amount: number;
  spent: number;
  category_name: string;
  category_color: string;
  category_icon: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
  deadline: string | null;
  created_at: string;
}

export interface DailySeriesPoint {
  date: string;
  dayLabel: string;
  income: number;
  expense: number;
}

export interface MonthlySeriesPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownItem {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface SmartInsight {
  id: string;
  tone: 'positive' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
}

export interface AnalyticsSummary {
  monthIncome: number;
  monthExpense: number;
  netCashflow: number;
  savingsRate: number;
  prevMonthIncome: number;
  prevMonthExpense: number;
  incomeChangePct: number | null;
  expenseChangePct: number | null;
  totalBalance: number;
  avgDailyExpense: number;
  projectedMonthExpense: number;
  healthScore: number;
  dailySeries: DailySeriesPoint[];
  monthlySeries: MonthlySeriesPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  insights: SmartInsight[];
}

export interface BootstrapPayload {
  month: string;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: BudgetItem[];
  savingsGoals: SavingsGoal[];
  analytics: AnalyticsSummary;
}
