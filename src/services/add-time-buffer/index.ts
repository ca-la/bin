const BUFFER_PERCENT = 0.1;

// time should be a non-negative integer
export default function addTimeBuffer(numericTime: number): number {
  return Math.round(numericTime / (1 - BUFFER_PERCENT));
}
