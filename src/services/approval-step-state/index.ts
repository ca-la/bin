import Knex from 'knex';

import db from '../db';
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import { ApprovalStepState } from '../../components/approval-steps/domain-object';
import { findByDesignId as findProductTypeByDesignId } from '../../components/pricing-product-types/dao';

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

      await ApprovalStepsDAO.update(trx, {
        ...steps[0],
        reason: null,
        state: ApprovalStepState.COMPLETED
      });

      if (isBlank) {
        await ApprovalStepsDAO.update(trx, {
          ...steps[1],
          reason: null,
          state: ApprovalStepState.SKIP
        });
        await ApprovalStepsDAO.update(trx, {
          ...steps[2],
          state: ApprovalStepState.BLOCKED,
          reason: 'Pending production partner pairing'
        });
      } else {
        await ApprovalStepsDAO.update(trx, {
          ...steps[1],
          state: ApprovalStepState.BLOCKED,
          reason: 'Pending technical partner pairing'
        });
      }
    }
  });
}
