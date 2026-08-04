import { computeShareAmount } from './splitShare.js'

// A recurring definition is due for a month until it's been confirmed or
// skipped for that exact month — `lastConfirmedMonth` is the guard that
// stops it from re-prompting every time the app opens.
export const getDueRecurring = (recurringExpenses, month) =>
  recurringExpenses.filter((recurring) => recurring.lastConfirmedMonth !== month)

// Turns the due recurring definitions into real expense rows for the month,
// using any per-item amount overrides the user typed into the confirm prompt.
export const buildConfirmedExpenses = (due, month, nextId, amounts = {}) => {
  let id = nextId
  const expenses = due.map((recurring) => {
    const amount = amounts[recurring.id] ?? recurring.amount
    const day = String(Math.min(Math.max(recurring.dayOfMonth || 1, 1), 28)).padStart(2, '0')
    return {
      id: id++,
      date: `${month}-${day}`,
      month,
      category: recurring.category,
      place: recurring.place,
      note: recurring.note || '',
      amount,
      isSplit: recurring.isSplit,
      splitWith: recurring.isSplit ? recurring.splitWith : [],
      shareAmount: computeShareAmount(amount, recurring.isSplit, recurring.splitWith),
      settled: false,
    }
  })
  return { expenses, nextId: id }
}

// Stamps every recurring definition as handled for the month — used for both
// "Add All" and "Skip this month" since either way the prompt shouldn't
// reappear for the same month.
export const markRecurringHandled = (recurringExpenses, month) =>
  recurringExpenses.map((recurring) => ({ ...recurring, lastConfirmedMonth: month }))
