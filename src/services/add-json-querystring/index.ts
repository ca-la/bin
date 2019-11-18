import qs from 'querystring';

export function addJson<T extends object>(
  queryKey: string,
  payload: T
): string {
  const stringPayload = qs.escape(JSON.stringify(payload));
  return qs.stringify({ [queryKey]: stringPayload });
}
