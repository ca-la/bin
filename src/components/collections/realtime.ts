import { CollectionSubmissionStatus } from "./types";

export interface RealtimeCollectionStatusUpdated {
  collectionId: string;
  resource: CollectionSubmissionStatus;
  type: "collection/status-updated";
}

export function isRealtimeCollectionStatusUpdated(
  data: any
): data is RealtimeCollectionStatusUpdated {
  return (
    "collectionId" in data &&
    "resource" in data &&
    "type" in data &&
    data.type === "collection/status-updated"
  );
}
