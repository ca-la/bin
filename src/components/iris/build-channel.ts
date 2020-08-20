export function buildChannelName(
  resourceType: string,
  resourceId: string
): string {
  return `${resourceType}/${resourceId}`;
}
