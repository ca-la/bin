import Knex from 'knex';

import db from '../db';
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../../components/approval-steps/domain-object';
import { findByDesignId as findProductTypeByDesignId } from '../../components/pricing-product-types/dao';

export async function transitionState(
  stepId: string,
  designId: string,
  newState: ApprovalStepState
): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const steps = (await ApprovalStepsDAO.findByDesign(trx, designId)).filter(
      (step: ApprovalStep): boolean => step.state !== ApprovalStepState.SKIP
    );
    const updatedIndex = steps.findIndex(
      (step: ApprovalStep): boolean => step.id === stepId
    );
    if (updatedIndex === -1) {
      throw new Error(
        `Step with ID ${stepId} not found for design with ID ${designId}`
      );
    }

    await ApprovalStepsDAO.update(trx, { id: stepId, state: newState });
    const nextStep = steps[updatedIndex + 1];

    if (
      nextStep &&
      nextStep.state === ApprovalStepState.UNSTARTED &&
      newState === ApprovalStepState.COMPLETED
    ) {
      await ApprovalStepsDAO.update(trx, {
        id: nextStep.id,
        reason: null,
        state: ApprovalStepState.CURRENT
      });
    }
  });
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

      await ApprovalStepsDAO.update(trx, {
        ...checkoutStep,
        reason: null,
        state: ApprovalStepState.COMPLETED
      });

      if (isBlank) {
        await ApprovalStepsDAO.update(trx, {
          ...technicalDesignStep,
          reason: null,
          state: ApprovalStepState.SKIP
        });
      }
    }
  });
}
