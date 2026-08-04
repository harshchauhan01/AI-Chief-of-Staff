// Runnable self-check: `node src/utils/quickTemplates.check.mjs`
import assert from 'node:assert'
import { buildQuickTemplates } from './quickTemplates.js'

const expenses = [
  { date: '2026-08-01', place: 'Swiggy', category: 'food', amount: 200 },
  { date: '2026-08-05', place: 'swiggy', category: 'food', amount: 250 },
  { date: '2026-08-10', place: 'Uber', category: 'transport', amount: 100 },
  { date: '2026-08-11', place: '', category: 'other', amount: 50 },
]

const result = buildQuickTemplates(expenses)

assert.strictEqual(result.length, 1) // Uber only seen once, blank place skipped
assert.strictEqual(result[0].place, 'Swiggy')
assert.strictEqual(result[0].amount, 250) // most recent amount, not first

console.log('quickTemplates: ok')
