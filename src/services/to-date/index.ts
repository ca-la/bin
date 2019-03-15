/**
 * Returns a `Date` if the input is parseable by `Date`, or else `null`
 */
export default function toDateOrNull(
  input: string | number | Date | null | undefined
): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  const date = new Date(input);
  if (isNaN(date.valueOf())) {
    throw new Error(`Invalid date string provided ${input}`);
  }

  return date;
}

/**
 * Returns an ISO8601 date string if input is parseable by `Date`, or else `null`
 */
export function toDateStringOrNull(
  input: string | number | Date | null | undefined
): string | null {
  const maybeDate = toDateOrNull(input);

  return maybeDate && maybeDate.toISOString();
}
