import { CATEGORY_MAP } from '../constants/moneyCategories'
import { asCurrency } from '../utils/money'

// One-tap re-add for frequent place+category combos — tapping a chip only
// prefills the Add Expense form, it never submits on its own.
function QuickTemplateChips({ templates, onPick }) {
  if (templates.length === 0) {
    return null
  }

  return (
    <div className="money-template-chips no-print">
      {templates.map((template) => (
        <button
          key={`${template.place}|${template.category}`}
          type="button"
          className="pill-btn"
          onClick={() => onPick(template)}
        >
          {template.place} · {CATEGORY_MAP[template.category]?.label || template.category} ·{' '}
          {asCurrency(template.amount)}
        </button>
      ))}
    </div>
  )
}

export default QuickTemplateChips
