import { computeSpendAmount } from './splitShare.js'

// Buckets persist across months, so unlike the month-scoped category
// breakdown, this sums every expense ever tagged with the bucket.
export const buildBucketSummaries = (buckets, expenses) => {
  const spentByBucket = new Map()
  for (const expense of expenses) {
    if (!expense.bucketId) {
      continue
    }
    const amount = computeSpendAmount(expense)
    spentByBucket.set(expense.bucketId, (spentByBucket.get(expense.bucketId) || 0) + amount)
  }

  return buckets.map((bucket) => {
    const spent = spentByBucket.get(bucket.id) || 0
    const target = bucket.target || null
    return {
      ...bucket,
      spent,
      percent: target ? Math.min((spent / target) * 100, 100) : null,
      overTarget: target != null && spent > target,
    }
  })
}
