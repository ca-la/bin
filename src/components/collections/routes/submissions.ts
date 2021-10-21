import Knex from "knex";
import uuid from "node-uuid";
import ProductDesignsDAO from "../../product-designs/dao";
import DesignEventsDAO from "../../design-events/dao";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import * as CreateNotifications from "../../../services/create-notifications";
import { determineSubmissionStatus } from "../services/determine-submission-status";
import ApprovalStepsDAO from "../../approval-steps/dao";
import ApprovalStep, { ApprovalStepType } from "../../approval-steps/types";
import * as IrisService from "../../iris/send-message";
import { CollectionSubmissionStatus } from "../types";
import { realtimeCollectionStatusUpdated } from "../realtime";
import { templateDesignEvent } from "../../design-events/types";
import { sendCartDetailsUpdate } from "../services/send-cart-details-update";
import db from "../../../services/db";

async function handleSubmit(
  collectionId: string,
  userId: string,
  collectionStatus: CollectionSubmissionStatus,
  ktx: Knex = db
): Promise<void> {
  await CreateNotifications.sendDesignerSubmitCollection(collectionId, userId);
  await IrisService.sendMessage(
    realtimeCollectionStatusUpdated(collectionStatus)
  );
  await sendCartDetailsUpdate(ktx, collectionId);
}

export function* createSubmission(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId, trx } = this.state;

  const designs: ProductDesign[] = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );

  for (const design of designs) {
    const steps = yield ApprovalStepsDAO.findByDesign(trx, design.id);
    const checkoutStep = steps.find(
      (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
    );

    if (!checkoutStep) {
      this.throw("Could not find checkout step for collection submission");
    }
    yield DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      actorId: userId,
      approvalStepId: checkoutStep.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      type: "SUBMIT_DESIGN",
    });
  }

  const submissionStatusByCollection = yield determineSubmissionStatus(
    [collectionId],
    trx
  );
  const collectionStatus = submissionStatusByCollection[collectionId];
  yield handleSubmit(collectionId, userId, collectionStatus, trx);

  this.status = 201;
  this.body = collectionStatus;
}

export function* getSubmissionStatus(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const submissionStatusByCollection = yield determineSubmissionStatus([
    collectionId,
  ]);

  this.status = 200;
  this.body = submissionStatusByCollection[collectionId];
}
