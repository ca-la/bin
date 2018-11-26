const DEFAULT_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function generateLabel(index: number): string {
  const label = DEFAULT_LABELS[index % DEFAULT_LABELS.length];
  const quotient = Math.floor(index / DEFAULT_LABELS.length);

  return quotient > 0 ? generateLabel(quotient - 1) + label : label;
}
