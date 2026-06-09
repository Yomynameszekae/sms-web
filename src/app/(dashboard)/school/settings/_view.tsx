'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { schoolSettingsApi } from '@/lib/api/endpoints/school-settings';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { useThemeStore, type ThemeId } from '@/store/theme.store';
import { cn } from '@/lib/utils';
import type { SchoolSetting } from '@/types/api';

const stringSchema = z.object({ value: z.string() });
const numberSchema = z.object({ value: z.coerce.number() });
const booleanSchema = z.object({ value: z.enum(['true', 'false']) });

function formatLabel(key: string) {
  return key
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SettingRow({ setting }: { setting: SchoolSetting }) {
  const [editing, setEditing] = useState(false);
  const { type, value } = setting.valueJson;

  const schema =
    type === 'number' ? numberSchema :
    type === 'boolean' ? booleanSchema :
    stringSchema;

  const form = useForm({ resolver: zodResolver(schema) });

  const { mutate: updateSetting, isPending } = useApiMutation({
    mutationFn: (newValue: string | number | boolean) =>
      schoolSettingsApi.update(setting.key, { type, value: newValue }).then((r) => r.data.data),
    successMessage: 'Setting updated.',
    invalidateKeys: [queryKeys.schoolSettings.list()],
    onSuccess: () => setEditing(false),
  });

  function openEdit() {
    form.reset({ value: type === 'boolean' ? String(value) : String(value) });
    setEditing(true);
  }

  function onSubmit(data: { value: string | number }) {
    const coerced =
      type === 'number' ? Number(data.value) :
      type === 'boolean' ? data.value === 'true' :
      String(data.value);
    updateSetting(coerced);
  }

  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{formatLabel(setting.key)}</p>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-center gap-2 shrink-0"
        >
          {type === 'boolean' ? (
            <Select {...form.register('value')} className="w-28 h-8 text-xs">
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              {...form.register('value')}
              className="w-48 h-8 text-xs"
            />
          )}
          <Button type="submit" size="sm" variant="ghost" disabled={isPending} className="h-8 w-8 p-0">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">
            {String(value)}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={openEdit}
            className="h-7 w-7 p-0 text-muted-foreground"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: {
  id: ThemeId;
  name: string;
  sidebar: string;
  primary: string;
  accent: string;
  dark: boolean;
}[] = [
  { id: 'sand-clay',    name: 'Sand & Clay',          sidebar: '#EEE7DB', primary: '#A85C41', accent: '#F0E1D8', dark: false },
  { id: 'greige-sage',  name: 'Greige & Sage',         sidebar: '#FFFFFF', primary: '#46694F', accent: '#E4EDE4', dark: false },
  { id: 'slate-peach',  name: 'Slate & Peach',         sidebar: '#F4F4F7', primary: '#565F84', accent: '#E0996F', dark: false },
  { id: 'deep-navy',    name: 'Blue-Black & Off-White', sidebar: '#101B2A', primary: '#1C2A3F', accent: '#8AA0C2', dark: true  },
  { id: 'navy-gold',    name: 'Navy, Gold & White',    sidebar: '#14233A', primary: '#1E3A5F', accent: '#C9952A', dark: true  },
];

function ThemePicker() {
  const { theme, setTheme } = useThemeStore();

  return (
    <Card className="p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        appearance
      </h3>
      <p className="text-sm font-medium mb-3">Interface Theme</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {THEME_OPTIONS.map((t) => {
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                'relative rounded-lg border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary shadow-sm'
                  : 'border-border hover:border-primary/50',
              )}
              aria-pressed={selected}
              aria-label={`${t.name} theme`}
            >
              <div className="mb-2 flex gap-1">
                <span
                  className="h-5 w-5 rounded-sm"
                  style={{ background: t.sidebar, border: '1px solid rgba(0,0,0,0.08)' }}
                />
                <span
                  className="h-5 w-5 rounded-sm"
                  style={{ background: t.primary }}
                />
                <span
                  className="h-5 w-5 rounded-sm"
                  style={{ background: t.accent, border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
              <p className="text-xs font-medium leading-tight">{t.name}</p>
              {selected && (
                <span className="absolute right-2 top-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Theme is saved locally on this device. School-wide theme sync is planned for a later phase.
      </p>
    </Card>
  );
}

export function SchoolSettingsView() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.schoolSettings.list(),
    queryFn: () => schoolSettingsApi.list().then((r) => r.data.data),
  });

  const grouped = data?.reduce<Record<string, SchoolSetting[]>>((acc, s) => {
    const ns = s.key.split('.')[0];
    if (!acc[ns]) acc[ns] = [];
    acc[ns].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Settings"
        description="Configure system-wide behaviour — curriculum scope, number formats, and more."
      />

      <ThemePicker />

      {isLoading && (
        <Card className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </Card>
      )}

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {grouped &&
        Object.entries(grouped).map(([ns, settings]) => (
          <Card key={ns} className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {ns.replace(/_/g, ' ')}
            </h3>
            {settings.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </Card>
        ))}
    </div>
  );
}
