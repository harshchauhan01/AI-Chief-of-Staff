export const CATEGORIES = [
  { value: 'food', label: 'Food', color: '#2a78d6' },
  { value: 'transport', label: 'Transport', color: '#eb6834' },
  { value: 'rent', label: 'Rent', color: '#1baf7a' },
  { value: 'bills', label: 'Bills', color: '#eda100' },
  { value: 'shopping', label: 'Shopping', color: '#e87ba4' },
  { value: 'health', label: 'Health', color: '#008300' },
  { value: 'entertainment', label: 'Entertainment', color: '#4a3aa7' },
  { value: 'education', label: 'Education', color: '#e34948' },
  { value: 'other', label: 'Other', color: '#898781' },
]

export const CATEGORY_MAP = CATEGORIES.reduce((map, category) => {
  map[category.value] = category
  return map
}, {})
