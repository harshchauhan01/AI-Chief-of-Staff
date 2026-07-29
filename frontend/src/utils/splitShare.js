import { toNumber } from './money'

// Equal split: the total amount divided across the people it's split with,
// plus you. Used identically by MoneyTrackerPage, QuickAddExpensePage, and
// SplitExpenseFields so "your share" always means the same thing everywhere.
export const computeShareAmount = (amount, isSplit, splitWith) => {
  const total = toNumber(amount)
  if (!isSplit) {
    return total
  }
  const people = Math.max(splitWith.length + 1, 1)
  return Number((total / people).toFixed(2))
}
