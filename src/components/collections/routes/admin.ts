import * as NotificationsService from "../../../services/create-notifications";
import {
  commitCostInputs as commitInputs,
  recostInputs as recost,
} from "../services/cost-inputs";
import * as IrisService from "../../iris/send-message";
import { realtimeCollectionStatusUpdated } from "../realtime";
import { determineSubmissionStatus } from "../services/determine-submission-status";

async function sendCollectionStatusUpdated(
  collectionId: string
): Promise<void> {
  const statusByCollectionId = await determineSubmissionStatus([collectionId]);
  const collectionStatus = statusByCollectionId[collectionId];
  if (!collectionStatus) {
    throw new Error(`Could not get the status for collection ${collectionId}`);
  }

  await IrisService.sendMessage(
    realtimeCollectionStatusUpdated(collectionStatus)
  );
}

async function handleCommitCostInputs(
  collectionId: string,
  userId: string
): Promise<void> {
  await NotificationsService.immediatelySendFullyCostedCollection(
    collectionId,
    userId
  );
  await sendCollectionStatusUpdated(collectionId);
}

export function* commitCostInputs(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  yield commitInputs(collectionId, userId);
  yield handleCommitCostInputs(collectionId, userId);
  this.status = 204;
}

export function* recostInputs(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  yield recost(collectionId);
  yield commitInputs(collectionId, userId);
  yield handleCommitCostInputs(collectionId, userId);
  this.status = 204;
}
