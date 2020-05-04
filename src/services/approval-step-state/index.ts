import Knex from 'knex';
import * as uuid from 'node-uuid';

import db from '../db';
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import * as BidTaskTypesDAO from '../../components/bid-task-types/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../../components/approval-steps/domain-object';
import { findByDesignId as findProductTypeByDesignId } from '../../components/pricing-product-types/dao';
import { taskTypes } from '../../components/tasks/templates';

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
        ApprovalStepState.SKIP
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
    state: ApprovalStepState.CURRENT
  });
}

export async function handleStepCompletion(
  trx: Knex.Transaction,
  step: ApprovalStep
): Promise<void> {
  await makeNextStepCurrentIfNeeded(trx, step);
  // TODO: update step completed_at date
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
    commentId: null,
    type: 'STEP_COMPLETE'
  });
  // TODO: Send notification
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

      const isBlank = productType.complexity === 'BLANK';
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
          `Unable to find technical design approval step for design "${
            design.id
          }"`
        );
      }

      await ApprovalStepsDAO.update(trx, checkoutStep.id, {
        reason: null,
        state: ApprovalStepState.COMPLETED
      });

      if (isBlank) {
        await ApprovalStepsDAO.update(trx, technicalDesignStep.id, {
          reason: null,
          state: ApprovalStepState.SKIP
        });
      }
    }
  });
}

export async function actualizeDesignStepsAfterBidAcceptance(
  trx: Knex.Transaction,
  bidId: string,
  designId: string
): Promise<void> {
  const bidTaskTypes = await BidTaskTypesDAO.findByBidId(trx, bidId);

  const approvalSteps = await ApprovalStepsDAO.find(trx, {
    designId
  });
  const newStates = approvalSteps.map((step: ApprovalStep) => step.state);

  for (const bidTaskType of bidTaskTypes) {
    switch (bidTaskType.taskTypeId) {
      case taskTypes.TECHNICAL_DESIGN.id: {
        const index = approvalSteps.findIndex(
          (step: ApprovalStep) =>
            step.type === ApprovalStepType.TECHNICAL_DESIGN
        );
        if (index > -1 && newStates[index] === ApprovalStepState.BLOCKED) {
          newStates[index] = ApprovalStepState.UNSTARTED;
        }
        break;
      }
      case taskTypes.PRODUCTION.id: {
        const index = approvalSteps.findIndex(
          (step: ApprovalStep) => step.type === ApprovalStepType.SAMPLE
        );
        if (index > -1 && newStates[index] === ApprovalStepState.BLOCKED) {
          newStates[index] = ApprovalStepState.UNSTARTED;
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
        state: newStates[i]
      } as Partial<ApprovalStep>);
    }
  }
}
