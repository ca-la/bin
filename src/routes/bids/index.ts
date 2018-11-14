import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import Bid from '../../domain-objects/bid';
import ProductDesign = require('../../domain-objects/product-design');
import * as UsersDAO from '../../dao/users';
import * as BidsDAO from '../../dao/bids';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import * as CollaboratorsDAO from '../../dao/collaborators';
import requireAdmin = require('../../middleware/require-admin');
import requireAuth = require('../../middleware/require-auth');
import { hasOnlyProperties } from '../../services/require-properties';

const router = new Router();

type IOBid = Bid & { design: ProductDesign };

function isIOBid(candidate: object | null): candidate is IOBid {
  return Boolean(candidate) && hasOnlyProperties(
    candidate,
    'id',
    'createdAt',
    'createdBy',
    'quoteId',
    'bidPriceCents',
    'description',
    'design'
  );
}

async function attachDesignsToBids(bids: Bid[]): Promise<IOBid[]> {
  const designs = await Promise.all(
    bids.map(async (bid: Bid) => ({
      bid,
      design: await ProductDesignsDAO.findByQuoteId(bid.quoteId)
    }))
  );
  const removeBidsWithDeletedDesigns = isIOBid;

  return designs
    .map(({ design, bid }: { design: ProductDesign | null, bid: Bid }) => {
      if (!design) {
        return null;
      }

      return {
        ...bid,
        design
      };
    })
    .filter(removeBidsWithDeletedDesigns);
}

function isExpired(bid: Bid): boolean {
  const dayAfterCreation = new Date(bid.createdAt);
  dayAfterCreation.setDate(dayAfterCreation.getDate() + 1);

  return new Date().getTime() > dayAfterCreation.getTime();
}

function not(predicateFunction: (a: any) => boolean): (a: any) => boolean {
  return (a: any): boolean => !predicateFunction(a);
}

function* listBidsByAssignee(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { state, userId } = this.query;
  const isAdmin = this.state.role === 'ADMIN';

  if (!userId) {
    this.throw(400, 'You must specify the user to retrieve bids for');
    return;
  }

  if (!isAdmin && userId !== this.state.userId) {
    this.throw(403, 'You can only retrieve bids for your own user');
    return;
  }

  let bids: Bid[] = [];
  switch (state) {
    case 'ACCEPTED':
      bids = yield BidsDAO.findAcceptedByTargetId(userId);
      break;

    case 'EXPIRED':
      bids = yield BidsDAO.findOpenByTargetId(userId)
        .then((openBids: Bid[]): Bid[] => openBids.filter(isExpired));
      break;

    case 'OPEN':
    case undefined:
      bids = yield BidsDAO.findOpenByTargetId(userId)
        .then((openBids: Bid[]): Bid[] => openBids.filter(not(isExpired)));
      break;

    default:
      this.throw(400, 'Invalid status query');
  }
  const ioBids: IOBid[] = yield attachDesignsToBids(bids);

  this.body = ioBids;
  this.status = 200;
}

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

  yield CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    role: 'PREVIEW',
    userId: target.id
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

  yield CollaboratorsDAO.deleteByDesignAndUser(design.id, target.id);

  this.status = 204;
}

router.get('/', requireAuth, listBidsByAssignee);
router.put('/:bidId/assignees/:userId', requireAdmin, assignBidToPartner);
router.get('/:bidId/assignees', requireAdmin, listBidAssignees);
router.del('/:bidId/assignees/:userId', requireAdmin, removeBidFromPartner);

module.exports = router.routes();
