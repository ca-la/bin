import uuid from 'node-uuid';
import Knex from 'knex';

import db from '../../../../services/db';
import * as DesignEventsDAO from '../../../../dao/design-events';
import DesignsDAO from '../../../product-designs/dao';
import ProductDesign = require('../../../product-designs/domain-objects/product-design');
import { expireCostInputs } from '../../../pricing-cost-inputs/dao';
import { immediatelySendFullyCostedCollection } from '../../../../services/create-notifications';

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
        await DesignEventsDAO.create(
          {
            actorId,
            bidId: null,
            createdAt: new Date(),
            designId: design.id,
            id: uuid.v4(),
            quoteId: null,
            targetId: design.userId,
            type: 'COMMIT_COST_INPUTS'
          },
          trx
        );
      }
    }
  );

  await immediatelySendFullyCostedCollection(collectionId, actorId);
}
