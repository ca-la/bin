import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";

import {
  CollectionSubmissionStatus,
  serializedCollectionSubmissionStatus,
} from "./types";

export const realtimeCollectionStatusUpdatedSchema = z.object({
  type: z.literal("collection/status-updated"),
  resource: serializedCollectionSubmissionStatus,
  channels: z.array(z.string()),
});
export type RealtimeCollectionStatusUpdated = z.infer<
  typeof realtimeCollectionStatusUpdatedSchema
>;

export function realtimeCollectionStatusUpdated(
  submissionStatus: CollectionSubmissionStatus
): RealtimeCollectionStatusUpdated {
  return {
    type: "collection/status-updated",
    resource: submissionStatus,
    channels: [buildChannelName("collections", submissionStatus.collectionId)],
  };
}
