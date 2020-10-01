import Knex from "knex";
import * as uuid from "node-uuid";

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
import DesignEvent, {
  templateDesignEvent,
} from "../../components/design-events/types";

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
    ...templateDesignEvent,
    actorId,
    approvalStepId: step.id,
    createdAt: new Date(),
    designId: step.designId,
    id: uuid.v4(),
    type: "STEP_COMPLETE",
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
    ...templateDesignEvent,
    actorId,
    approvalStepId: step.id,
    createdAt: new Date(),
    designId: step.designId,
    id: uuid.v4(),
    type: "STEP_REOPEN",
  });
  // TODO: cause any related notification to not be returned any more
}

export async function transitionCheckoutState(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const designs = await ProductDesignsDAO.findByCollectionId(collectionId, trx);

  for (const design of designs) {
    const steps = await ApprovalStepsDAO.findByDesign(trx, design.id);
    const productType = await findProductTypeByDesignId(design.id, trx);
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
  const design = await ProductDesignsDAO.findById(
    designId,
    undefined,
    undefined,
    trx
  );
  if (!design) {
    throw new Error(`Could not find design ${designId}`);
  }
  const approvalSteps = await ApprovalStepsDAO.find(
    trx,
    { designId },
    (query: Knex.QueryBuilder) =>
      query.whereNot({ state: ApprovalStepState.SKIP })
  );
  const newStates = approvalSteps.map((step: ApprovalStep) => step.state);

  const baseDesignEvent: Unsaved<DesignEvent> = {
    ...templateDesignEvent,
    actorId,
    bidId,
    designId,
    quoteId,
    type: "STEP_PARTNER_PAIRING",
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
          await notifications[NotificationType.APPROVAL_STEP_PAIRING].send(
            trx,
            event.actorId,
            {
              recipientCollaboratorId: null,
              recipientUserId: design.userId,
            },
            {
              approvalStepId: approvalSteps[index].id,
              designId,
              collectionId: design.collectionIds[0] || null,
            }
          );
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
          await notifications[NotificationType.APPROVAL_STEP_PAIRING].send(
            trx,
            event.actorId,
            {
              recipientCollaboratorId: null,
              recipientUserId: design.userId,
            },
            {
              approvalStepId: approvalSteps[index].id,
              designId,
              collectionId: design.collectionIds[0] || null,
            }
          );
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
        startedAt:
          newStates[i] === ApprovalStepState.CURRENT ? new Date() : null,
        reason: null,
        state: newStates[i],
      } as Partial<ApprovalStep>);
    }
  }
}

export async function updateTechnicalDesignStepForDesign(
  trx: Knex.Transaction,
  designId: string,
  needsTechnicalDesigner: boolean = false
): Promise<void> {
  const technicalDesignStep = await ApprovalStepsDAO.findOne(trx, {
    designId,
    type: ApprovalStepType.TECHNICAL_DESIGN,
  });

  if (!technicalDesignStep) {
    throw new Error(
      `Could not find technical design step for design with ID: ${designId}`
    );
  }

  if (needsTechnicalDesigner) {
    if (technicalDesignStep.state === ApprovalStepState.UNSTARTED) {
      await ApprovalStepsDAO.update(trx, technicalDesignStep.id, {
        startedAt: null,
        reason: "Awaiting partner pairing",
        state: ApprovalStepState.BLOCKED,
      });
    }
  } else {
    if (technicalDesignStep.state === ApprovalStepState.BLOCKED) {
      await ApprovalStepsDAO.update(trx, technicalDesignStep.id, {
        startedAt: null,
        reason: null,
        state: ApprovalStepState.UNSTARTED,
      });
    }
  }
}
