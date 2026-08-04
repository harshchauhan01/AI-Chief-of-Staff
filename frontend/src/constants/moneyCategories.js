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

// Keyword -> category, checked as a substring match against the place text
// (case-insensitive). Order matters: first match wins.
const CATEGORY_KEYWORDS = [
  ['food', ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'zepto', 'blinkit', 'grocery', 'grocer']],
  ['transport', ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'irctc', 'railway']],
  ['rent', ['rent', 'landlord']],
  ['bills', ['electricity', 'recharge', 'broadband', 'wifi', 'gas bill', 'water bill', 'dth']],
  ['shopping', ['amazon', 'flipkart', 'myntra', 'mall', 'store']],
  ['health', ['pharmacy', 'hospital', 'clinic', 'medical', 'doctor']],
  ['entertainment', ['netflix', 'spotify', 'prime video', 'hotstar', 'movie', 'cinema', 'bookmyshow']],
  ['education', ['school', 'college', 'course', 'tuition', 'udemy']],
]

// Best-effort guess only — always leaves the user free to change it, never
// trusted as ground truth.
export const guessCategoryFromPlace = (place) => {
  const text = String(place || '').toLowerCase()
  if (!text) {
    return ''
  }
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category
    }
  }
  return ''
}
