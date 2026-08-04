const WIDTH = 320
const HEIGHT = 160
const PAD_LEFT = 40
const PAD = 24
const Y_TICKS = 4
const LABEL_STEP = 5

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

const asCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function DailyUsageChart({ items }) {
  const max = Math.max(...items.map((item) => item.amount), 0)

  if (max <= 0) {
    return <p className="money-empty">No spending logged for this month yet.</p>
  }

  const innerWidth = WIDTH - PAD_LEFT - PAD
  const innerHeight = HEIGHT - PAD * 2
  const stepX = items.length > 1 ? innerWidth / (items.length - 1) : 0
  const points = items.map((item, i) => ({
    ...item,
    x: PAD_LEFT + i * stepX,
    y: PAD + innerHeight - (item.amount / max) * innerHeight,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => {
    const value = (max / Y_TICKS) * i
    return { value, y: PAD + innerHeight - (value / max) * innerHeight }
  })

  return (
    <div className="money-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label="Daily spending this month">
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={PAD_LEFT} y1={tick.y} x2={WIDTH - PAD} y2={tick.y} stroke="#efece2" strokeWidth={1} />
            <text x={PAD_LEFT - 6} y={tick.y + 3} fontSize="9" textAnchor="end" fill="#7a7869">
              {compactCurrency(tick.value)}
            </text>
          </g>
        ))}
        <path d={linePath} fill="none" stroke="#4a7c59" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={p.amount > 0 ? 3 : 2} fill="#4a7c59" className="money-donut-slice">
            <title>{`Day ${p.day}: ${asCurrency(p.amount)}`}</title>
          </circle>
        ))}
        {points
          .filter((p) => p.day === 1 || p.day % LABEL_STEP === 0)
          .map((p) => (
            <text key={p.date} x={p.x} y={HEIGHT - 4} fontSize="9" textAnchor="middle" fill="#7a7869">
              {p.day}
            </text>
          ))}
      </svg>
    </div>
  )
}

export default DailyUsageChart
