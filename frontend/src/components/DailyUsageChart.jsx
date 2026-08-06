const WIDTH = 320
const HEIGHT = 160
const PAD_LEFT = 40
const PAD = 24
const Y_TICKS = 4
const LABEL_STEP = 5
const BAR_GAP = 2

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

const asCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function DailyUsageChart({ items, total }) {
  const max = Math.max(...items.map((item) => item.amount), 0)

  if (max <= 0) {
    return <p className="money-empty">No spending logged for this month yet.</p>
  }

  const innerWidth = WIDTH - PAD_LEFT - PAD
  const innerHeight = HEIGHT - PAD * 2
  const barWidth = innerWidth / items.length
  const bars = items.map((item, i) => ({
    ...item,
    x: PAD_LEFT + i * barWidth,
    barHeight: (item.amount / max) * innerHeight,
  }))
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => {
    const value = (max / Y_TICKS) * i
    return { value, y: PAD + innerHeight - (value / max) * innerHeight }
  })
  const highestDay = bars.reduce((best, bar) => (bar.amount > best.amount ? bar : best), bars[0])

  return (
    <>
      {typeof total === 'number' && (
        <p className="money-daily-total">
          Total this month: <strong>{asCurrency(total)}</strong> · highest day was{' '}
          <strong>day {highestDay.day}</strong> at {asCurrency(highestDay.amount)}
        </p>
      )}
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
        {bars.map((bar) => (
          <rect
            key={bar.date}
            x={bar.x + BAR_GAP / 2}
            y={PAD + innerHeight - bar.barHeight}
            width={Math.max(barWidth - BAR_GAP, 1)}
            height={Math.max(bar.barHeight, bar.amount > 0 ? 2 : 0)}
            fill={bar.day === highestDay.day ? '#2f6b3f' : '#4a7c59'}
            rx={1}
          >
            <title>{`Day ${bar.day}: ${asCurrency(bar.amount)}`}</title>
          </rect>
        ))}
        {bars
          .filter((bar) => bar.day === 1 || bar.day % LABEL_STEP === 0)
          .map((bar) => (
            <text key={bar.date} x={bar.x + barWidth / 2} y={HEIGHT - 4} fontSize="9" textAnchor="middle" fill="#7a7869">
              {bar.day}
            </text>
          ))}
      </svg>
      </div>
    </>
  )
}

export default DailyUsageChart
