// Runnable self-check: `node src/utils/dailyBreakdown.check.mjs`
import assert from 'node:assert'
import { buildDailyBreakdown } from './dailyBreakdown.js'

const expenses = [
  { date: '2026-08-01', amount: 100, isSplit: false },
  { date: '2026-08-01', amount: 50, isSplit: false },
  { date: '2026-08-03', amount: 200, isSplit: true, settled: true, shareAmount: 80 },
  { date: '2026-08-03', amount: 20, isSplit: true, settled: false, shareAmount: 10 },
]

const result = buildDailyBreakdown(expenses, '2026-08', 5)

assert.strictEqual(result.length, 5)
assert.strictEqual(result[0].amount, 150) // day 1: 100 + 50
assert.strictEqual(result[1].amount, 0) // day 2: no expenses
assert.strictEqual(result[2].amount, 100) // day 3: settled share (80) + unsettled full (20)
assert.strictEqual(result[3].amount, 0)
assert.strictEqual(result[4].date, '2026-08-05')

console.log('dailyBreakdown: ok')
