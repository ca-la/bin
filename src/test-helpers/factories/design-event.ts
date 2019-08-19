import * as uuid from 'node-uuid';
import { create } from '../../dao/design-events';
import DesignEvent from '../../domain-objects/design-event';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import * as ProductDesignsDAO from '../../components/product-designs/dao';

interface DesignEventWithResources {
  designEvent: DesignEvent;
  design: ProductDesign;
  actor: any;
}

export default async function generateDesignEvent(
  options: Partial<DesignEvent> = {}
): Promise<DesignEventWithResources> {
  const { user: actor } = options.actorId
    ? { user: await findUserById(options.actorId) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await ProductDesignsDAO.create({
        productType: 'SWEATER',
        title: 'Mohair Wool Sweater',
        userId: actor.id
      });

  if (!design) {
    throw new Error('Design was unable to be found or created!');
  }

  const designEvent = await create({
    actorId: actor.id,
    bidId: null,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'SUBMIT_DESIGN',
    ...options
  });

  return { actor, designEvent, design };
}
