import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as DesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import ProductDesign = require('../../domain-objects/product-design');
import * as DesignTasksService from '../../services/create-design-tasks';
import * as NotificationsService from '../../services/create-notifications';

export function* commitCostInputs(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs = yield DesignsDAO.findByCollectionId(collectionId);

  yield Promise.all(
    designs.map(
      async (design: ProductDesign): Promise<void> => {
        await DesignEventsDAO.create({
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
    )
  );
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

  yield Promise.all(
    designs.map(
      async (design: ProductDesign): Promise<void> => {
        await DesignEventsDAO.create({
          actorId: userId,
          bidId: null,
          createdAt: new Date(),
          designId: design.id,
          id: uuid.v4(),
          quoteId: null,
          targetId: null,
          type: 'COMMIT_PARTNER_PAIRING'
        });
        await DesignTasksService.createDesignTasks({
          designId: design.id,
          designPhase: 'POST_APPROVAL'
        });
      }
    )
  );

  this.status = 204;
}
