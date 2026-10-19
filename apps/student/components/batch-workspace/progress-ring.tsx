import React from 'react';

interface ProgressRingProps {
  /** 0–100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  complete?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** A small circular progress indicator, with optional centred content. Decorative: pair it with text. */
export function ProgressRing({ percent, size = 40, strokeWidth = 3, complete = false, className = '', children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={`transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none ${
            complete ? 'stroke-success' : 'stroke-primary'
          }`}
        />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </span>
  );
}
