export const red = '\x1b[31m';
export const green = '\x1b[32m';
export const yellow = '\x1b[33m';
export const blue = '\x1b[34m';
export const reset = '\x1b[0m';

export function format(color: string, message: string): string {
  return `${color}${message}${reset}`;
}
