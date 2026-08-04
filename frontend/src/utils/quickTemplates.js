// Suggests one-tap re-add chips by ranking recurring place+category combos
// from expense history. Needs at least 2 occurrences so a single one-off
// purchase never shows up as a "frequent" template.
const MIN_OCCURRENCES = 2
const MAX_TEMPLATES = 5

export const buildQuickTemplates = (expenses) => {
  const groups = new Map()

  for (const expense of expenses) {
    const place = (expense.place || '').trim()
    if (!place) {
      continue
    }
    const key = `${place.toLowerCase()}|${expense.category}`
    const group = groups.get(key) || { place, category: expense.category, count: 0, lastAmount: 0, lastDate: '' }
    group.count += 1
    if (expense.date >= group.lastDate) {
      group.lastDate = expense.date
      group.lastAmount = expense.amount
    }
    groups.set(key, group)
  }

  return Array.from(groups.values())
    .filter((group) => group.count >= MIN_OCCURRENCES)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TEMPLATES)
    .map(({ place, category, lastAmount }) => ({ place, category, amount: lastAmount }))
}
