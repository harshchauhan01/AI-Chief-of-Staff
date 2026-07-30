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

// What actually counts toward "how much have I spent": for a split expense
// you paid the FULL amount out of pocket, and only your share of it is truly
// yours to keep counting once the others have actually paid you back. Until
// an expense is marked settled we have no idea whether that happened, so it
// counts as the full amount — not the (unverified) reduced share.
export const computeSpendAmount = (expense) => {
  const amount = toNumber(expense.amount)
  if (!expense.isSplit) {
    return amount
  }
  return expense.settled ? toNumber(expense.shareAmount ?? amount) : amount
}
