import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { CLICK_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../../lib/linkQuery';

// Search box + filter/sort dropdowns for the My Links page.
export default function LinksToolbar({ searchText, onSearchTextChange, query, onChange, showClear, onClear }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
      <Input
        label="Search"
        type="search"
        placeholder="Search by title, URL, or short code"
        maxLength={200}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        className="sm:col-span-2 xl:col-span-1"
      />
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={query.status}
        onChange={(event) => onChange({ status: event.target.value })}
      />
      <Select
        label="Clicks"
        options={CLICK_OPTIONS}
        value={query.clicks}
        onChange={(event) => onChange({ clicks: event.target.value })}
      />
      <Select
        label="Sort by"
        options={SORT_OPTIONS}
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value })}
        className="sm:col-span-2 xl:col-span-1"
      />
      {showClear && (
        <div className="sm:col-span-2 xl:col-span-4">
          <Button variant="ghost" size="sm" onClick={onClear} className="-ml-3">
            <X className="size-4" aria-hidden="true" />
            Clear search and filters
          </Button>
        </div>
      )}
    </div>
  );
}
