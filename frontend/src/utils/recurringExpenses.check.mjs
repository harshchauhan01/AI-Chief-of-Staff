// Runnable self-check: `node src/utils/recurringExpenses.check.mjs`
import assert from 'node:assert'
import { buildConfirmedExpenses, getDueRecurring, markRecurringHandled } from './recurringExpenses.js'

const recurring = [
  { id: 1, place: 'Landlord', category: 'rent', amount: 15000, dayOfMonth: 1, isSplit: false, splitWith: [], lastConfirmedMonth: '2026-08' },
  { id: 2, place: 'Netflix', category: 'entertainment', amount: 500, dayOfMonth: 5, isSplit: false, splitWith: [], lastConfirmedMonth: null },
]

const due = getDueRecurring(recurring, '2026-08')
assert.strictEqual(due.length, 1) // rent already confirmed for August
assert.strictEqual(due[0].place, 'Netflix')

const { expenses, nextId } = buildConfirmedExpenses(due, '2026-08', 10, { 2: 600 })
assert.strictEqual(expenses.length, 1)
assert.strictEqual(expenses[0].amount, 600) // override applied
assert.strictEqual(expenses[0].date, '2026-08-05')
assert.strictEqual(nextId, 11)

const handled = markRecurringHandled(recurring, '2026-08')
assert.ok(handled.every((r) => r.lastConfirmedMonth === '2026-08'))

console.log('recurringExpenses: ok')
