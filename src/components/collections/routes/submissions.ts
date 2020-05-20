import Knex from "knex";
import uuid from "node-uuid";
import ProductDesignsDAO from "../../product-designs/dao";
import * as DesignEventsDAO from "../../../dao/design-events";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import * as CreateNotifications from "../../../services/create-notifications";
import { determineSubmissionStatus } from "../services/determine-submission-status";
import db from "../../../services/db";
import ApprovalStepsDAO from "../../approval-steps/dao";
import ApprovalStep, { ApprovalStepType } from "../../approval-steps/types";

export function* createSubmission(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs: ProductDesign[] = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );

  yield db.transaction(async (trx: Knex.Transaction) => {
    for (const design of designs) {
      const steps = await ApprovalStepsDAO.findByDesign(trx, design.id);
      const checkoutStep = steps.find(
        (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
      );

      if (!checkoutStep) {
        this.throw("Could not find checkout step for collection submission");
      }
      await DesignEventsDAO.create(trx, {
        actorId: userId,
        approvalStepId: checkoutStep.id,
        approvalSubmissionId: null,
        bidId: null,
        commentId: null,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: "SUBMIT_DESIGN",
      });
    }
  });
  CreateNotifications.sendDesignerSubmitCollection(collectionId, userId);
  const submissionStatusByCollection = yield determineSubmissionStatus([
    collectionId,
  ]);
  this.status = 201;
  this.body = submissionStatusByCollection[collectionId];
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
