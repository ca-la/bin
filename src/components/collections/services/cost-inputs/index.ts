import uuid from 'node-uuid';
import Knex from 'knex';

import db from '../../../../services/db';
import * as DesignEventsDAO from '../../../../dao/design-events';
import DesignsDAO from '../../../product-designs/dao';
import ProductDesign = require('../../../product-designs/domain-objects/product-design');
import {
  attachProcesses,
  create as createCostInput,
  expireCostInputs
} from '../../../pricing-cost-inputs/dao';
import { immediatelySendFullyCostedCollection } from '../../../../services/create-notifications';
import { getDesignsMetaByCollection } from '../determine-submission-status';
import { BasePricingCostInput } from '../../../pricing-cost-inputs/domain-object';

/**
 * Commits cost inputs for every design in the given collection.
 */
export async function commitCostInputs(
  collectionId: string,
  actorId: string
): Promise<void> {
  const designs = await DesignsDAO.findByCollectionId(collectionId);
  const designIds = designs.map((design: ProductDesign): string => design.id);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      await expireCostInputs(designIds, twoWeeksFromNow, trx);

      for (const design of designs) {
        await DesignEventsDAO.create(trx, {
          actorId,
          approvalStepId: null,
          approvalSubmissionId: null,
          bidId: null,
          commentId: null,
          createdAt: new Date(),
          designId: design.id,
          id: uuid.v4(),
          quoteId: null,
          targetId: design.userId,
          type: 'COMMIT_COST_INPUTS'
        });
      }
    }
  );

  await immediatelySendFullyCostedCollection(collectionId, actorId);
}

/**
 * Re-cost inputs for every design in the expired collection.
 */
export async function recostInputs(collectionId: string): Promise<void> {
  const designs = (await getDesignsMetaByCollection([collectionId]))[
    collectionId
  ];
  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      for (const design of designs) {
        const costInput = design.costInputs.reduce<BasePricingCostInput | null>(
          (
            latestCost: BasePricingCostInput | null,
            currentCost: BasePricingCostInput
          ) => {
            if (
              !latestCost ||
              new Date(currentCost.createdAt) > new Date(latestCost.createdAt)
            ) {
              return currentCost;
            }
            return latestCost;
          },
          null
        );
        if (!costInput) {
          continue;
        }
        const newCostInputBlank = {
          ...(await attachProcesses<BasePricingCostInput>(costInput)),
          createdAt: new Date(),
          deletedAt: null,
          expiresAt: null,
          id: uuid.v4()
        };
        await createCostInput(trx, newCostInputBlank);
      }
    }
  );
}
