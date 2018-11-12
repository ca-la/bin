import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as UsersDAO from '../../dao/users';
import * as BidsDAO from '../../dao/bids';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import requireAdmin = require('../../middleware/require-admin');

const router = new Router();

function* assignBidToPartner(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { bidId, userId } = this.params;

  const bid = yield BidsDAO.findById(bidId);
  if (!bid) {
    this.throw(404, `No Bid found for ID: ${bidId}`);
    return;
  }

  const design = yield ProductDesignsDAO.findByQuoteId(bid.quoteId);
  if (!design) {
    this.throw(404, `No Design found for Quote with ID: ${bid.quoteId}`);
    return;
  }

  const target = yield UsersDAO.findById(userId);
  if (!target) {
    this.throw(404, `No User found for ID: ${userId}`);
    return;
  }

  yield DesignEventsDAO.create({
    actorId: this.state.userId,
    bidId,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    targetId: target.id,
    type: 'BID_DESIGN'
  });

  this.status = 204;
}

function* listBidAssignees(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { bidId } = this.params;
  const assignees = yield UsersDAO.findByBidId(bidId);

  this.body = assignees;
  this.status = 200;
}

function* removeBidFromPartner(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { bidId, userId } = this.params;

  const bid = yield BidsDAO.findById(bidId);
  if (!bid) {
    this.throw(404, `No Bid found for ID: ${bidId}`);
    return;
  }

  const design = yield ProductDesignsDAO.findByQuoteId(bid.quoteId);
  if (!design) {
    this.throw(404, `No Design found for Quote with ID: ${bid.quoteId}`);
    return;
  }

  const target = yield UsersDAO.findById(userId);
  if (!target) {
    this.throw(404, `No User found for ID: ${userId}`);
    return;
  }

  yield DesignEventsDAO.create({
    actorId: this.state.userId,
    bidId,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    targetId: target.id,
    type: 'REMOVE_PARTNER'
  });

  this.status = 204;
}

router.put('/:bidId/assignees/:userId', requireAdmin, assignBidToPartner);
router.get('/:bidId/assignees', requireAdmin, listBidAssignees);
router.del('/:bidId/assignees/:userId', requireAdmin, removeBidFromPartner);

module.exports = router.routes();
