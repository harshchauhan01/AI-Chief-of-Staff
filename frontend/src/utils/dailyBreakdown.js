import { computeSpendAmount } from './splitShare.js'

// One point per calendar day of the month, zero-filled so the line chart
// never has gaps for no-spend days.
export const buildDailyBreakdown = (monthExpenses, monthIso, daysInMonth) => {
  const totals = new Map()
  for (const expense of monthExpenses) {
    totals.set(expense.date, (totals.get(expense.date) || 0) + computeSpendAmount(expense))
  }

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const date = `${monthIso}-${String(day).padStart(2, '0')}`
    return { date, day, amount: totals.get(date) || 0 }
  })
}
