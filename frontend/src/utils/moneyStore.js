export const MONEY_STORAGE_KEY = 'orion-money-tracker:v1'

const emptyState = () => ({ budgets: {}, expenses: [], nextId: 1, recurringExpenses: [], buckets: [] })

export const loadMoneyState = () => {
  if (typeof window === 'undefined') {
    return emptyState()
  }

  const raw = localStorage.getItem(MONEY_STORAGE_KEY)
  if (!raw) {
    return emptyState()
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      budgets: parsed && typeof parsed.budgets === 'object' && parsed.budgets !== null ? parsed.budgets : {},
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
      nextId: Number.isFinite(Number(parsed?.nextId)) ? Number(parsed.nextId) : 1,
      recurringExpenses: Array.isArray(parsed?.recurringExpenses) ? parsed.recurringExpenses : [],
      buckets: Array.isArray(parsed?.buckets) ? parsed.buckets : [],
    }
  } catch {
    return emptyState()
  }
}

export const saveMoneyState = (state) => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(MONEY_STORAGE_KEY, JSON.stringify(state))
}

// Appends one expense to whatever is already saved and persists it — used by
// the quick-add page, which only ever needs to add a single row at a time.
export const addExpenseToStore = (expense) => {
  const state = loadMoneyState()
  const saved = { ...expense, id: state.nextId }
  const nextState = {
    ...state,
    expenses: [saved, ...state.expenses],
    nextId: state.nextId + 1,
  }
  saveMoneyState(nextState)
  return saved
}
