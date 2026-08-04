# Daily Usage Chart Toggle — Design

## Summary

Add a "Daily Usage" line chart to the Money Tracker page as an alternative view to the existing category pie chart. A pill toggle switches between the two views; only one is visible at a time.

## Background

`MoneyTrackerPage.jsx` currently shows a `CategoryBreakdownChart` (hand-rolled SVG donut, no charting library) built from `categoryBreakdown`, a `useMemo` that aggregates the selected month's expenses by category using `computeSpendAmount` (from `frontend/src/utils/splitShare.js`). There is no existing day-level aggregation.

A toggle/pill-button pattern already exists in `DailyPlanPage.jsx` (`.pill-btn` / `.pill-btn.active` classes, state-driven, no library) and will be reused as-is for visual/interaction consistency.

## Scope

- Month scope matches the page's existing month selector (same data window as the pie chart).
- One new chart: daily total spend as a line with a dot per day.
- One new toggle: switches between "By Category" (pie) and "Daily Usage" (line).
- No new dependencies (no charting library).

Out of scope: rolling 30-day view, per-category breakdown within the daily chart, animations, date range picker.

## Data

New pure function (exported from a small util, e.g. `frontend/src/utils/dailyBreakdown.js`) that takes the month's expenses + the month string and returns:

```js
[{ date: 'YYYY-MM-DD', day: 1, amount: 0 }, ...] // one entry per calendar day in the month
```

Rules:
- Iterate every calendar day of the selected month (using the month's actual day count).
- For each day, sum `computeSpendAmount(expense)` over expenses whose `date` matches.
- Days with no matching expenses get `amount: 0` (no gaps in the line).

`MoneyTrackerPage.jsx` calls this in a new `dailyBreakdown` `useMemo`, sibling to the existing `categoryBreakdown` useMemo, reusing the same `monthExpenses` source array.

## Component

New `frontend/src/components/DailyUsageChart.jsx`:
- Hand-rolled inline SVG, consistent with `CategoryBreakdownChart.jsx` (no charting library added).
- Props: `items` (the `dailyBreakdown` array), `total` (optional, for a header stat, mirroring the pie chart's `total` prop usage).
- Renders:
  - A polyline connecting each day's amount, y-scaled to the month's max day value.
  - A small circle (dot) marker at each day's data point.
  - Sparse x-axis day labels (e.g. every 5th day) to avoid crowding on 28–31 point months.
- Empty-state: if every day is 0 (no expenses in month), render existing "no data" treatment consistent with how `CategoryBreakdownChart` handles an empty month.

## Toggle

- New state in `MoneyTrackerPage.jsx`: `activeChartView` (`'category' | 'daily'`), default `'category'`.
- Pill toggle rendered above the chart card, reusing `.pill-btn` / `.pill-btn.active` classes from existing CSS (same pattern as `DailyPlanPage.jsx`'s mode toggle).
- Conditionally renders `<CategoryBreakdownChart>` or `<DailyUsageChart>` based on `activeChartView` — never both mounted/visible simultaneously.

## Testing

Extract the aggregation as a standalone pure function (`buildDailyBreakdown(expenses, month)` or similar) precisely so it can be unit-tested independently of React rendering. One small test file (e.g. `frontend/src/utils/dailyBreakdown.test.js`, matching whatever test runner the project already uses) asserting:
- A day with one expense sums correctly.
- A day with multiple expenses (including a split/settled expense via `computeSpendAmount`) sums correctly.
- A day with no expenses in the month yields `amount: 0`, and no day is missing from the output.

## Explicitly skipped (YAGNI)

- No new charting library/dependency — matches the existing hand-rolled SVG convention.
- No rolling/custom date range — reuses the page's existing month selector.
- No animation.
- No per-category color-coding within the daily line (single series only, since the request was "daily money usage").
