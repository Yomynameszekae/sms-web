'use client';

import * as React from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  /** Optional dimmed suffix, e.g. "(terminated)". */
  hint?: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * Server mode: called (debounced) as the user types; the parent re-fetches
   * and passes fresh `options` + `loading`. Without it the component filters
   * `options` client-side — only use that when the FULL option set is loaded.
   */
  onSearch?: (query: string) => void;
  loading?: boolean;
  /** Message for zero matches; receives the current query. */
  emptyMessage?: (query: string) => string;
  'aria-invalid'?: boolean;
}

/**
 * A type-to-filter replacement for long <Select>s, built on the existing
 * theme tokens (border-input, ring, popover, accent) so it renders correctly
 * across all five themes. Keyboard: ArrowUp/Down move, Enter selects,
 * Escape closes (without closing the parent dialog). The listbox is
 * positioned within the form flow (no portal), so inside a dialog it extends
 * the scrollable body instead of clipping or fighting the dialog's focus
 * trap.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  onSearch,
  loading,
  emptyMessage = (q) => (q ? `No matches for '${q}'` : 'No options'),
  'aria-invalid': ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlighted, setHighlighted] = React.useState(0);
  // Labels of options the user has picked — lets the trigger keep showing the
  // selection even when a later server search narrows `options` past it.
  const [labelCache, setLabelCache] = React.useState<Record<string, string>>({});
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = React.useId();

  const serverMode = !!onSearch;
  const shown = React.useMemo(() => {
    if (serverMode || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, serverMode]);

  // Clamp instead of effect-resetting when the option set shrinks.
  const activeIndex = shown.length ? Math.min(highlighted, shown.length - 1) : 0;

  const selected = options.find((o) => o.value === value);
  const displayLabel = value
    ? selected
      ? selected.label + (selected.hint ? ` ${selected.hint}` : '')
      : labelCache[value] ?? value
    : '';

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlighted(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (onSearch) onSearch('');
  }, [onSearch]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row in view.
  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleQueryChange(q: string) {
    setQuery(q);
    setHighlighted(0);
    if (!serverMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch?.(q), 250);
  }

  function select(option: SearchableOption) {
    setLabelCache((cache) => ({
      ...cache,
      [option.value]: option.label + (option.hint ? ` ${option.hint}` : ''),
    }));
    onChange(option.value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Swallow it — Escape must close the listbox, not the parent dialog.
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(Math.min(activeIndex + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[activeIndex]) select(shown[activeIndex]);
    } else if (e.key === 'Tab') {
      close();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-[42px] w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          ariaInvalid && 'border-destructive',
        )}
      >
        <span className={cn('truncate text-left', !displayLabel && 'text-muted-foreground')}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-2 border-b px-3">
            {loading
              ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              : <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Type to filter…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div ref={listRef} id={listboxId} role="listbox" className="max-h-56 overflow-y-auto p-1">
            {loading && !shown.length ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            ) : !shown.length ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage(query.trim())}</div>
            ) : (
              shown.map((option, i) => (
                <div
                  key={option.value || '∅'}
                  data-index={i}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => { e.preventDefault(); select(option); }}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-2 text-sm',
                    i === activeIndex && 'bg-accent text-accent-foreground',
                    option.value === value && 'font-medium',
                  )}
                >
                  {option.label}
                  {option.hint && <span className="ml-1.5 text-xs text-muted-foreground">{option.hint}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
