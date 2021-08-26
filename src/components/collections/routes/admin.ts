import { z } from "zod";

import * as NotificationsService from "../../../services/create-notifications";
import {
  commitCostInputs as commitInputs,
  recostInputs as recost,
} from "../services/cost-inputs";
import * as IrisService from "../../iris/send-message";
import { realtimeCollectionStatusUpdated } from "../realtime";
import { determineSubmissionStatus } from "../services/determine-submission-status";
import { StrictContext } from "../../../router-context";
import { parseContext } from "../../../services/parse-context";
import DesignEvent from "../../design-events/types";
import { rejectCollection as rejectCollectionService } from "../../../services/reject-collection";

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

interface RejectCollectionContext extends StrictContext<DesignEvent[]> {
  state: AuthedState;
}

const rejectCollectionContextSchema = z.object({
  state: z.object({
    userId: z.string(),
  }),
  params: z.object({
    collectionId: z.string(),
  }),
});

export async function rejectCollection(ctx: RejectCollectionContext) {
  const {
    state: { userId },
    params: { collectionId },
  } = parseContext(ctx, rejectCollectionContextSchema);

  const rejectEvents = await rejectCollectionService(collectionId, userId);
  await sendCollectionStatusUpdated(collectionId);
  await NotificationsService.immediatelySendRejectCollection(
    collectionId,
    userId
  );

  ctx.body = rejectEvents;
  ctx.status = 200;
}
