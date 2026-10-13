import Input from '../ui/Input';
import Select from '../ui/Select';
import { RANGE_PRESETS, toDateKey } from '../../lib/dateRange';
import { withoutProtocol } from '../../lib/format';

const CUSTOM = 'custom';
const truncate = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/**
 * The one filter row above the analytics content: date range first, then link.
 * Every section on the page uses the same filtered data, so the numbers always agree.
 */
export default function AnalyticsFilters({ range, onRangeChange, linkId, onLinkChange, linkOptions }) {
  const today = toDateKey(new Date());
  const rangeOptions = [...RANGE_PRESETS, { value: CUSTOM, label: 'Custom range' }];

  const linkChoices = [
    { value: '', label: 'All links' },
    ...(linkOptions.links ?? []).map((link) => ({
      value: link.id,
      label: `${withoutProtocol(link.shortUrl)} → ${truncate(withoutProtocol(link.originalUrl), 32)}`,
    })),
  ];

  return (
    <div className="flex flex-wrap items-end gap-4">
      <Select
        label="Date range"
        options={rangeOptions}
        value={range.preset ?? CUSTOM}
        onChange={(event) => {
          const value = event.target.value;
          // Switching to "Custom range" starts from the dates currently shown.
          onRangeChange(value === CUSTOM ? { from: range.fromKey, to: range.toKey } : { preset: value });
        }}
        className="w-full sm:w-48"
      />

      {range.preset === null && (
        <>
          <Input
            label="From"
            type="date"
            value={range.fromKey}
            max={range.toKey}
            onChange={(event) => event.target.value && onRangeChange({ from: event.target.value, to: range.toKey })}
            className="w-[calc(50%-0.5rem)] sm:w-44"
          />
          <Input
            label="To"
            type="date"
            value={range.toKey}
            min={range.fromKey}
            max={today}
            onChange={(event) => event.target.value && onRangeChange({ from: range.fromKey, to: event.target.value })}
            className="w-[calc(50%-0.5rem)] sm:w-44"
          />
        </>
      )}

      <Select
        label="Link"
        options={linkChoices}
        value={linkId}
        onChange={(event) => onLinkChange(event.target.value)}
        disabled={linkOptions.loading}
        className="w-full sm:w-80"
      />
    </div>
  );
}
