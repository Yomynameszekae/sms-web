import * as React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.ComponentProps<'input'> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-input accent-primary cursor-pointer',
            className,
          )}
          {...props}
        />
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
