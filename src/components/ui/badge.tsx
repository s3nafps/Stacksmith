import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  dot?: boolean;
}

function Badge({ className, variant = 'neutral', dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)} {...props}>
      {dot && (
        <span
          className={cn('inline-block w-1.5 h-1.5 rounded-full', {
            'bg-[var(--success)]': variant === 'success',
            'bg-[var(--warning)]': variant === 'warning',
            'bg-[var(--error)]': variant === 'error',
            'bg-[var(--info)]': variant === 'info',
            'bg-[var(--text-tertiary)]': variant === 'neutral',
          })}
        />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
