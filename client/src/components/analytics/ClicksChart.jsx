import { useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Table from '../ui/Table';
import { formatDayLong, formatDayShort, formatNumber } from '../../lib/format';

// Chart colors (SVG attributes need real values, not CSS variables).
// The series color is the brand blue, validated with the dataviz palette
// checker against the white surface (lightness, chroma, and contrast all pass).
const SERIES = '#315ce8';
const GRID = '#e3e8ef'; // one step off the white surface: a recessive hairline
const AXIS_LINE = '#cfd7e3';
const AXIS_TEXT = '#5f6b7f';

// Tooltip: the value leads (large, strong), the label follows (smaller, muted).
// Defined outside the chart component so React does not recreate it on every render.
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-raised">
      <p className="text-xs text-ink-subtle">{formatDayLong(day.date)}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES }} />
        <span className="font-semibold text-ink">{formatNumber(day.clicks)}</span>
        <span className="text-ink-muted">{day.clicks === 1 ? 'click' : 'clicks'}</span>
      </p>
      <p className="mt-0.5 pl-5 text-xs text-ink-muted">
        {formatNumber(day.uniqueVisitors)} unique {day.uniqueVisitors === 1 ? 'visitor' : 'visitors'}
      </p>
    </div>
  );
}

/**
 * Clicks per day as an area chart (one series: no legend needed, the title
 * names it). Every chart has a table twin for screen readers and exact values.
 */
export default function ClicksChart({ timeline, rangeLabel }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const titleId = useId();

  return (
    <Card>
      <figure aria-labelledby={titleId}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <figcaption>
            <h2 id={titleId} className="text-base font-semibold text-ink">
              Clicks over time
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">{rangeLabel} · per day</p>
          </figcaption>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((shown) => !shown)}
            aria-expanded={showTable}
            aria-controls={tableId}
          >
            <Table2 className="size-4" aria-hidden="true" />
            {showTable ? 'Hide table' : 'Show as table'}
          </Button>
        </div>

        {/* Fixed height includes the x-axis labels, so the card never gets a nested scroll. */}
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDayShort}
                tickLine={false}
                axisLine={{ stroke: AXIS_LINE }}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={formatNumber}
                tickLine={false}
                axisLine={false}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }} />
              <Area
                type="linear"
                dataKey="clicks"
                name="Clicks"
                stroke={SERIES}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill={SERIES}
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 5, fill: SERIES, stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div id={tableId} hidden={!showTable} className="mt-4 max-h-80 overflow-y-auto">
          <Table caption="Clicks and unique visitors per day">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="text-right">
                  Clicks
                </th>
                <th scope="col" className="text-right">
                  Unique visitors
                </th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((day) => (
                <tr key={day.date}>
                  <td>{formatDayLong(day.date)}</td>
                  <td className="text-right tabular-nums">{formatNumber(day.clicks)}</td>
                  <td className="text-right tabular-nums">{formatNumber(day.uniqueVisitors)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </figure>
    </Card>
  );
}
