import * as React from 'react';
import { Label } from '@/components/ui/label';

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  children
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {counter && <span className="text-xs text-muted-foreground">{counter}</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
