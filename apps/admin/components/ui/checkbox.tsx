'use client';

import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', indeterminate, ...props }, ref) => {
    const defaultRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || defaultRef;

    React.useEffect(() => {
      if (combinedRef.current) {
        combinedRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [combinedRef, indeterminate]);

    return (
      <input
        type="checkbox"
        ref={combinedRef}
        className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 accent-primary cursor-pointer ${className}`}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
