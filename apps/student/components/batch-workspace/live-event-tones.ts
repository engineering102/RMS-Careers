/**
 * Per-session colours for the Live Lectures calendar (one colour per recurring lecture, like Teams categories).
 * Literal class strings so Tailwind keeps them; all four are theme tokens with light and dark values.
 */
const TONES = [
  { block: 'border-primary bg-primary/15 hover:bg-primary/25', dot: 'bg-primary', bar: 'bg-primary' },
  { block: 'border-info bg-info/15 hover:bg-info/25', dot: 'bg-info', bar: 'bg-info' },
  { block: 'border-success bg-success/15 hover:bg-success/25', dot: 'bg-success', bar: 'bg-success' },
  { block: 'border-warning bg-warning/15 hover:bg-warning/25', dot: 'bg-warning', bar: 'bg-warning' }
] as const;

export function eventTone(index: number) {
  return TONES[((index % TONES.length) + TONES.length) % TONES.length];
}
