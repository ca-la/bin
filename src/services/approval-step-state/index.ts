import Knex from "knex";
import * as uuid from "node-uuid";

import db from "../db";
import * as ProductDesignsDAO from "../../components/product-designs/dao";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";
import * as BidTaskTypesDAO from "../../components/bid-task-types/dao";
import DesignEventsDAO from "../../components/design-events/dao";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../../components/approval-steps/domain-object";
import { findByDesignId as findProductTypeByDesignId } from "../../components/pricing-product-types/dao";
import { taskTypes } from "../../components/tasks/templates";
import { getDefaultsByDesign } from "../../components/approval-step-submissions/defaults";
import notifications from "../../components/approval-steps/notifications";
import { NotificationType } from "../../components/notifications/domain-object";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import DesignEvent from "../../components/design-events/types";

export async function makeNextStepCurrentIfNeeded(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  const nextStep = await ApprovalStepsDAO.findOne(
    trx,
    { designId: step.designId },
    (query: Knex.QueryBuilder) => {
      return query.whereRaw(`ordering > ? and state <> ?`, [
        step.ordering,
        ApprovalStepState.SKIP,
      ]);
    }
  );
  if (!nextStep) {
    return;
  }
  if (nextStep.state !== ApprovalStepState.UNSTARTED) {
    return;
  }
  await ApprovalStepsDAO.update(trx, nextStep.id, {
    reason: null,
    state: ApprovalStepState.CURRENT,
    startedAt: new Date(),
  });
}

export async function createSubmissionsByProductType(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  const submissions = await getDefaultsByDesign(trx, step.designId);

  await ApprovalStepSubmissionsDAO.createAll(trx, submissions);
}

export async function handleStepCompletion(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  await makeNextStepCurrentIfNeeded(trx, step);

  if (step.type === ApprovalStepType.CHECKOUT) {
    await createSubmissionsByProductType(trx, step);
  }
}

export async function handleUserStepCompletion(
  trx: Knex.Transaction,
  step: ApprovalStep,
  actorId: string
): Promise<void> {
  await DesignEventsDAO.create(trx, {
    actorId,
    approvalStepId: step.id,
    approvalSubmissionId: null,
    bidId: null,
    createdAt: new Date(),
    designId: step.designId,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: "STEP_COMPLETE",
    taskTypeId: null,
    commentId: null,
  });

  const design = await ProductDesignsDAO.findById(step.designId);
  if (!design) {
    throw new Error(`Could not find a design with id: ${step.designId}`);
  }

  await notifications[NotificationType.APPROVAL_STEP_COMPLETION].send(
    trx,
    actorId,
    {
      recipientUserId: design.userId,
      recipientCollaboratorId: null,
    },
    {
      approvalStepId: step.id,
      designId: design.id,
      collectionId: design.collectionIds[0] || null,
    }
  );

  if (step.collaboratorId) {
    const collaborator = await CollaboratorsDAO.findById(step.collaboratorId);
    if (collaborator) {
      await notifications[NotificationType.APPROVAL_STEP_COMPLETION].send(
        trx,
        actorId,
        {
          recipientUserId: collaborator.userId,
          recipientCollaboratorId: collaborator.id,
        },
        {
          approvalStepId: step.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
        }
      );
    }
  }
}

async function unstartFormerlyCurrentStep(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  const formerCurrent = await ApprovalStepsDAO.findOne(
    trx,
    { designId: step.designId, state: ApprovalStepState.CURRENT },
    (query: Knex.QueryBuilder) => query.whereNot("id", step.id)
  );

  if (!formerCurrent) {
    return;
  }

  await ApprovalStepsDAO.update(trx, formerCurrent.id, {
    state: ApprovalStepState.UNSTARTED,
    startedAt: null,
  });
}

export async function handleStepReopen(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  await unstartFormerlyCurrentStep(trx, step);
}

export async function handleUserStepReopen(
  trx: Knex.Transaction,
  step: ApprovalStep,
  actorId: string
): Promise<void> {
  await DesignEventsDAO.create(trx, {
    actorId,
    approvalStepId: step.id,
    approvalSubmissionId: null,
    bidId: null,
    createdAt: new Date(),
    designId: step.designId,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: "STEP_REOPEN",
    taskTypeId: null,
    commentId: null,
  });
  // TODO: cause any related notification to not be returned any more
}

export async function transitionCheckoutState(
  collectionId: string
): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const designs = await ProductDesignsDAO.findByCollectionId(collectionId);

    for (const design of designs) {
      const steps = await ApprovalStepsDAO.findByDesign(trx, design.id);
      const productType = await findProductTypeByDesignId(design.id);
      if (!productType) {
        throw new Error(
          `Unable to find a PricingProductType for design "${design.id}".`
        );
      }

      const checkoutStep = steps.find(
        (step: ApprovalStep): boolean => step.type === ApprovalStepType.CHECKOUT
      );
      const technicalDesignStep = steps.find(
        (step: ApprovalStep): boolean =>
          step.type === ApprovalStepType.TECHNICAL_DESIGN
      );

      if (!checkoutStep) {
        throw new Error(
          `Unable to find checkout approval step for design "${design.id}"`
        );
      }

      if (!technicalDesignStep) {
        throw new Error(
          `Unable to find technical design approval step for design "${design.id}"`
        );
      }

      await ApprovalStepsDAO.update(trx, checkoutStep.id, {
        reason: null,
        state: ApprovalStepState.COMPLETED,
      });
    }
  });
}

export async function actualizeDesignStepsAfterBidAcceptance(
  trx: Knex.Transaction,
  event: DesignEvent
): Promise<void> {
  const { bidId, actorId, designId, quoteId } = event;
  if (!bidId) {
    throw new Error("bidId is missing");
  }
  const bidTaskTypes = await BidTaskTypesDAO.findByBidId(trx, bidId);

  const approvalSteps = await ApprovalStepsDAO.find(
    trx,
    { designId },
    (query: Knex.QueryBuilder) =>
      query.whereNot({ state: ApprovalStepState.SKIP })
  );
  const newStates = approvalSteps.map((step: ApprovalStep) => step.state);

  const baseDesignEvent: Unsaved<DesignEvent> = {
    actorId,
    approvalSubmissionId: null,
    bidId,
    commentId: null,
    designId,
    quoteId,
    targetId: null,
    type: "STEP_PARTNER_PAIRING",
    taskTypeId: null,
    approvalStepId: null,
  };
  for (const bidTaskType of bidTaskTypes) {
    switch (bidTaskType.taskTypeId) {
      case taskTypes.TECHNICAL_DESIGN.id: {
        const index = approvalSteps.findIndex(
          (step: ApprovalStep) =>
            step.type === ApprovalStepType.TECHNICAL_DESIGN
        );
        if (index > -1 && newStates[index] === ApprovalStepState.BLOCKED) {
          newStates[index] = ApprovalStepState.UNSTARTED;
          await DesignEventsDAO.create(trx, {
            ...baseDesignEvent,
            id: uuid.v4(),
            createdAt: new Date(),
            taskTypeId: bidTaskType.taskTypeId,
            approvalStepId: approvalSteps[index].id,
          });
        }
        break;
      }
      case taskTypes.PRODUCTION.id: {
        const index = approvalSteps.findIndex(
          (step: ApprovalStep) => step.type === ApprovalStepType.SAMPLE
        );
        if (index > -1 && newStates[index] === ApprovalStepState.BLOCKED) {
          newStates[index] = ApprovalStepState.UNSTARTED;
          await DesignEventsDAO.create(trx, {
            ...baseDesignEvent,
            id: uuid.v4(),
            createdAt: new Date(),
            taskTypeId: bidTaskType.taskTypeId,
            approvalStepId: approvalSteps[index].id,
          });
        }
        break;
      }
    }
  }
  const hasCurrent = newStates.some(
    (state: ApprovalStepState) => state === ApprovalStepState.CURRENT
  );
  if (!hasCurrent) {
    const firstUnstartedIndex = newStates.findIndex(
      (state: ApprovalStepState) => state === ApprovalStepState.UNSTARTED
    );
    const isPreviousStepCompleted =
      firstUnstartedIndex - 1 >= 0 &&
      newStates[firstUnstartedIndex - 1] === ApprovalStepState.COMPLETED;
    if (firstUnstartedIndex > -1 && isPreviousStepCompleted) {
      newStates[firstUnstartedIndex] = ApprovalStepState.CURRENT;
    }
  }

  // tslint:disable-next-line: no-for-in-array
  for (const i in newStates) {
    if (newStates[i] !== approvalSteps[i].state) {
      await ApprovalStepsDAO.update(trx, approvalSteps[i].id, {
        // while we don't set BLOCKING state in this function,
        // we can reset a reason to null
        reason: null,
        state: newStates[i],
      } as Partial<ApprovalStep>);
    }
  }
}
