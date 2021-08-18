import { z } from "zod";

export const channelResourceSchema = z.enum([
  "approval-steps",
  "designs",
  "submissions",
  "teams",
  "updates",
]);
export type ChannelResource = z.infer<typeof channelResourceSchema>;

export function buildChannelName(
  resourceType: ChannelResource,
  resourceId: string
): string {
  return `${resourceType}/${resourceId}`;
}
