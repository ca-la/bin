import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../../services/db';
import * as DesignsDAO from '../../../dao/product-designs';
import * as DesignEventsDAO from '../../../dao/design-events';
import createDesignTasks from '../../../services/create-design-tasks';
import isEveryDesignPaired from '../../../services/is-every-design-paired';
import * as NotificationsService from '../../../services/create-notifications';

export function* commitCostInputs(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs = yield DesignsDAO.findByCollectionId(collectionId);

  for (const design of designs) {
    yield DesignEventsDAO.create({
      actorId: userId,
      bidId: null,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: design.userId,
      type: 'COMMIT_COST_INPUTS'
    });
  }
  NotificationsService.immediatelySendFullyCostedCollection(
    collectionId,
    userId
  );

  this.status = 204;
}

export function* createPartnerPairing(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs = yield DesignsDAO.findByCollectionId(collectionId);
  const allArePaired = yield isEveryDesignPaired(collectionId);

  if (!allArePaired) {
    return this.throw(409, 'Designs are not all paired');
  }

  yield db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      for (const design of designs) {
        await DesignEventsDAO.create(
          {
            actorId: userId,
            bidId: null,
            createdAt: new Date(),
            designId: design.id,
            id: uuid.v4(),
            quoteId: null,
            targetId: null,
            type: 'COMMIT_PARTNER_PAIRING'
          },
          trx
        );
        await createDesignTasks(design.id, 'POST_APPROVAL', trx);
      }
    }
  );

  this.status = 204;
}
