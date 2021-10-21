import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";

import {
  CollectionSubmissionStatus,
  serializedCollectionSubmissionStatus,
  CartDetailsCollection,
  serializedCartDetailsCollectionSchema,
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

export const realtimeCartDetailsCollectionUpdatedSchema = z.object({
  type: z.literal("cart-details/collection-updated"),
  resource: serializedCartDetailsCollectionSchema,
  channels: z.array(z.string()),
});
export type RealtimeCartDetailsCollectionUpdated = z.infer<
  typeof realtimeCartDetailsCollectionUpdatedSchema
>;

export function realtimeCartDetailsCollectionUpdate(
  recipientUserId: string,
  collection: CartDetailsCollection
): RealtimeCartDetailsCollectionUpdated {
  return {
    type: "cart-details/collection-updated",
    resource: collection,
    channels: [buildChannelName("updates", recipientUserId)],
  };
}
