'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/**
 * Relationship of the guardian TO THE CHILD, as a short preset list with an
 * escape hatch.
 *
 * It was free text, which is how a column ends up holding "mother", "Mother",
 * "mum" and "M" for the same thing — none of which group, sort or filter.
 * The presets cover what a Ghanaian school records in practice; "Guardian"
 * earns its place because a child living with a non-parent relative is common
 * enough that forcing it into Aunt/Uncle would lose information.
 *
 * "Other" is NEVER what gets stored. Selecting it reveals a free-text box and
 * whatever is typed there is the stored value, so the column keeps holding a
 * real relationship rather than the word "Other".
 */
export const RELATIONSHIP_PRESETS = [
  'Mother',
  'Father',
  'Guardian',
  'Grandparent',
  'Aunt',
  'Uncle',
  'Sibling',
  'Step-parent',
  'Foster parent',
] as const;

const OTHER = '__other__';

/** relationship is VARCHAR(50); anything longer is refused by the database. */
export const RELATIONSHIP_MAX = 50;

/** Case-insensitive, so existing rows storing "mother" still match the preset. */
function matchPreset(value: string): string | null {
  const v = value.trim().toLowerCase();
  return RELATIONSHIP_PRESETS.find((p) => p.toLowerCase() === v) ?? null;
}

export function RelationshipField({
  value,
  onChange,
  helperText = 'Relationship lives on the link, not the guardian record.',
}: {
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) {
  // Decided once, from whatever the link already stores. A value that is not a
  // preset — including one typed before this field had presets — opens as
  // "Other" with the text preserved rather than being silently dropped.
  const [isOther, setIsOther] = useState(() => !!value.trim() && !matchPreset(value));

  const selectValue = isOther ? OTHER : (matchPreset(value) ?? '');

  return (
    <div className="space-y-1.5">
      <Label htmlFor="lf-rel">Relationship</Label>
      <Select
        id="lf-rel"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            setIsOther(true);
            // Clear the preset so the box starts empty rather than showing a
            // value the user has just said is wrong.
            onChange('');
          } else {
            setIsOther(false);
            onChange(next);
          }
        }}
      >
        <option value="">Not specified</option>
        {RELATIONSHIP_PRESETS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </Select>

      {isOther && (
        <Input
          id="lf-rel-other"
          autoFocus
          maxLength={RELATIONSHIP_MAX}
          placeholder="e.g. Cousin, Family friend"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
