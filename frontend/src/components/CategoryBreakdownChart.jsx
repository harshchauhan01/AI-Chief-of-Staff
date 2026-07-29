import { useMemo, useState } from 'react'

const SIZE = 180
const STROKE = 30
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3
const MAX_SLICES = 5
const OTHER_COLOR = '#898781'

const asCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

// Top 5 categories render as distinct slices; everything past that folds into
// one gray "Other" slice so the donut never exceeds ~6 segments at a glance.
const buildSlices = (items, total) => {
  if (total <= 0 || items.length === 0) {
    return []
  }

  const top = items.slice(0, MAX_SLICES)
  const foldedAmount = items.slice(MAX_SLICES).reduce((sum, item) => sum + item.amount, 0)
  const donutItems = foldedAmount > 0
    ? [...top, { category: '__other__', label: 'Other', color: OTHER_COLOR, amount: foldedAmount }]
    : top

  let cumulative = 0
  return donutItems.map((item) => {
    const fraction = item.amount / total
    const trueLength = fraction * CIRCUMFERENCE
    const dash = Math.max(trueLength - GAP, 0)
    const dashOffset = -(cumulative + GAP / 2)
    cumulative += trueLength

    return {
      ...item,
      percent: Number((fraction * 100).toFixed(1)),
      dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashOffset,
    }
  })
}

function CategoryBreakdownChart({ items, total }) {
  const [activeKey, setActiveKey] = useState(null)
  const slices = useMemo(() => buildSlices(items, total), [items, total])

  if (slices.length === 0) {
    return <p className="money-empty">No spending logged for this month yet.</p>
  }

  return (
    <div className="money-chart">
      <div className="money-donut-wrap">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Spending by category">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#efece2" strokeWidth={STROKE} />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {slices.map((slice) => (
              <circle
                key={slice.category}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={activeKey === slice.category ? STROKE + 4 : STROKE}
                strokeDasharray={slice.dashArray}
                strokeDashoffset={slice.dashOffset}
                className="money-donut-slice"
                tabIndex={0}
                onMouseEnter={() => setActiveKey(slice.category)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(slice.category)}
                onBlur={() => setActiveKey(null)}
              >
                <title>{`${slice.label}: ${asCurrency(slice.amount)} (${slice.percent}%)`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="money-donut-center">
          <strong>{asCurrency(total)}</strong>
          <span>Total spent</span>
        </div>
      </div>

      <ul className="money-legend">
        {slices.map((slice) => (
          <li
            key={slice.category}
            className={activeKey === slice.category ? 'money-legend-row active' : 'money-legend-row'}
            onMouseEnter={() => setActiveKey(slice.category)}
            onMouseLeave={() => setActiveKey(null)}
          >
            <span className="money-legend-swatch" style={{ background: slice.color }} aria-hidden="true" />
            <span className="money-legend-label">{slice.label}</span>
            <span className="money-legend-amount">{asCurrency(slice.amount)}</span>
            <span className="money-legend-percent">{slice.percent}%</span>
          </li>
        ))}
      </ul>

      <ul className="money-bar-list" aria-label="Full category breakdown">
        {items.map((item) => (
          <li key={item.category} className="money-bar-row">
            <span className="money-bar-label">{item.label}</span>
            <span className="money-bar-track">
              <span
                className="money-bar-fill"
                style={{ width: `${Math.max((item.amount / total) * 100, 2)}%`, background: item.color }}
              />
            </span>
            <span className="money-bar-value">{asCurrency(item.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CategoryBreakdownChart
