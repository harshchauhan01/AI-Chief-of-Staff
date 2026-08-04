// Runnable self-check: `node src/utils/bucketSpend.check.mjs`
import assert from 'node:assert'
import { buildBucketSummaries } from './bucketSpend.js'

const buckets = [
  { id: 1, name: 'Goa Trip', target: 50000 },
  { id: 2, name: 'New Laptop', target: null },
]

const expenses = [
  { bucketId: 1, amount: 20000, isSplit: false },
  { bucketId: 1, amount: 40000, isSplit: false },
  { bucketId: 2, amount: 5000, isSplit: false },
  { bucketId: null, amount: 500, isSplit: false }, // no bucket, ignored
  { bucketId: 3, amount: 999, isSplit: false }, // deleted bucket, ignored
]

const result = buildBucketSummaries(buckets, expenses)

assert.strictEqual(result[0].spent, 60000)
assert.strictEqual(result[0].percent, 100) // capped at 100 even though over target
assert.strictEqual(result[0].overTarget, true)
assert.strictEqual(result[1].spent, 5000)
assert.strictEqual(result[1].percent, null) // no target set

console.log('bucketSpend: ok')
