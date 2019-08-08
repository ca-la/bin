import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import Bid from './domain-object';
import Collaborator from '../collaborators/domain-objects/collaborator';
import ProductDesign = require('../../domain-objects/product-design');
import { PricingQuote } from '../../domain-objects/pricing-quote';
import * as UsersDAO from '../../components/users/dao';
import * as BidRejectionsDAO from '../bid-rejections/dao';
import * as BidsDAO from './dao';
import * as PricingQuotesDAO from '../../dao/pricing-quotes';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import * as CollaboratorsDAO from '../collaborators/dao';
import requireAdmin = require('../../middleware/require-admin');
import requireAuth = require('../../middleware/require-auth');
import * as NotificationsService from '../../services/create-notifications';
import { isExpired } from './services/is-expired';
import { hasActiveBids } from './services/has-active-bids';
import { MILLISECONDS_TO_EXPIRE } from './constants';
import { BidRejection } from '../bid-rejections/domain-object';
import { hasOnlyProperties } from '../../services/require-properties';

const router = new Router();

interface GetListQuery {
  limit?: number;
  offset?: number;
  state?: string;
}

interface IOBid extends Bid {
  design: ProductDesign;
}

async function attachDesignToBid(bid: Bid): Promise<IOBid | null> {
  const design = await ProductDesignsDAO.findByQuoteId(bid.quoteId);

  if (!design) {
    return null;
  }

  return {
    ...bid,
    design
  };
}

async function attachDesignsToBids(bids: Bid[]): Promise<IOBid[]> {
  const ioBids: IOBid[] = [];

  for (const bid of bids) {
    const maybeIOBid = await attachDesignToBid(bid);
    if (maybeIOBid) {
      ioBids.push(maybeIOBid);
    }
  }

  return ioBids;
}

function not(predicateFunction: (a: any) => boolean): (a: any) => boolean {
  return (a: any): boolean => !predicateFunction(a);
}

function* listAllBids(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { limit, offset, state }: GetListQuery = this.query;

  if (!limit || !offset) {
    this.throw(400, 'Must specify a limit and offset when fetching all bids!');
    return;
  }

  const bids = yield BidsDAO.findAll({ limit, offset, state });
  this.body = bids;
  this.status = 200;
}

function* listBidsByAssignee(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { state, userId } = this.query;

  if (!userId) {
    this.throw(400, 'You must specify the user to retrieve bids for');
    return;
  }

  let bids: Bid[] = [];
  switch (state) {
    case 'ACCEPTED':
      bids = yield BidsDAO.findAcceptedByTargetId(userId);
      break;

    case 'EXPIRED':
      bids = yield BidsDAO.findOpenByTargetId(userId).then(
        (openBids: Bid[]): Bid[] => openBids.filter(isExpired)
      );
      break;

    case 'REJECTED':
      bids = yield BidsDAO.findRejectedByTargetId(userId);
      break;

    case 'OPEN':
    case undefined:
      bids = yield BidsDAO.findOpenByTargetId(userId).then(
        (openBids: Bid[]): Bid[] => openBids.filter(not(isExpired))
      );
      break;

    default:
      this.throw(400, 'Invalid status query');
  }
  const ioBids: IOBid[] = yield attachDesignsToBids(bids);

  this.body = ioBids;
  this.status = 200;
}

function* listBids(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { userId } = this.query;
  const isAdmin = this.state.role === 'ADMIN';

  if (isAdmin && !userId) {
    yield listAllBids;
  } else if (isAdmin || userId === this.state.userId) {
    yield listBidsByAssignee;
  } else {
    this.throw(
      403,
      'You must either be an admin or retrieve bids for your own user!'
    );
    return;
  }
}

function* getUnpaidBidsByUserId(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { userId } = this.params;

  const bids = yield BidsDAO.findUnpaidByUserId(userId);
  this.body = bids;
  this.status = 200;
}

function* assignBidToPartner(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
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

  const hasActive = yield hasActiveBids(bid.quoteId, userId);
  if (hasActive) {
    this.throw(
      403,
      `There are active bids for user ${userId} on the design ${design.id}`
    );
    return;
  }

  yield DesignEventsDAO.create({
    actorId: this.state.userId,
    bidId,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: target.id,
    type: 'BID_DESIGN'
  });

  const maybeCollaborator = yield CollaboratorsDAO.findByDesignAndUser(
    design.id,
    userId
  );
  const now = new Date();
  const cancellationDate = new Date(now.getTime() + MILLISECONDS_TO_EXPIRE);

  if (!maybeCollaborator) {
    yield CollaboratorsDAO.create({
      cancelledAt: cancellationDate,
      collectionId: null,
      designId: design.id,
      invitationMessage: '',
      role: 'PREVIEW',
      userEmail: null,
      userId: target.id
    });
  } else if (maybeCollaborator.cancelledAt) {
    yield CollaboratorsDAO.update(maybeCollaborator.id, {
      cancelledAt: cancellationDate
    });
  }

  NotificationsService.sendPartnerDesignBid(
    design.id,
    this.state.userId,
    target.id
  );

  this.status = 204;
}

function* listBidAssignees(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { bidId } = this.params;
  const assignees = yield UsersDAO.findByBidId(bidId);

  this.body = assignees;
  this.status = 200;
}

function* removeBidFromPartner(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
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
    quoteId: null,
    targetId: target.id,
    type: 'REMOVE_PARTNER'
  });

  yield CollaboratorsDAO.cancelForDesignAndPartner(design.id, target.id);
  this.status = 204;
}

interface AcceptDesignBidContext extends Koa.Application.Context {
  params: {
    bidId: string;
  };
}

export function* acceptDesignBid(
  this: AcceptDesignBidContext
): AsyncIterableIterator<void> {
  const { bidId } = this.params;
  const { userId } = this.state;

  const bid: Bid = yield BidsDAO.findById(bidId);
  this.assert(bid, 404, `Bid not found with ID ${bidId}`);
  const quote: PricingQuote = yield PricingQuotesDAO.findById(bid.quoteId);

  if (!quote) {
    this.throw(`Quote not found with ID ${bid.quoteId}`);
    return;
  }

  this.assert(quote.designId, 400, 'Quote does not have a design');
  const collaborator: Collaborator = yield CollaboratorsDAO.findByDesignAndUser(
    quote.designId!,
    userId
  );
  this.assert(
    collaborator,
    403,
    'You may only accept a bid you have been assigned to'
  );

  const maybeIOBid = yield attachDesignToBid(bid);
  if (!maybeIOBid) {
    this.throw(400, `Design for bid ${bid.id} does not exist!`);
  }

  yield DesignEventsDAO.create({
    actorId: userId,
    bidId: bid.id,
    createdAt: new Date(),
    designId: quote.designId!,
    id: uuid.v4(),
    quoteId: bid.quoteId,
    targetId: null,
    type: 'ACCEPT_SERVICE_BID'
  });

  yield CollaboratorsDAO.update(collaborator.id, {
    cancelledAt: null,
    role: 'PARTNER'
  });
  yield NotificationsService.sendPartnerAcceptServiceBidNotification(
    quote.designId!,
    this.state.userId
  );

  this.status = 200;
  this.body = maybeIOBid;
}

interface RejectDesignBidContext extends Koa.Application.Context {
  params: {
    bidId: string;
  };
  body: Unsaved<BidRejection>;
}

function isRejectionReasons(data: object): data is Unsaved<BidRejection> {
  return hasOnlyProperties(
    data,
    'createdBy',
    'priceTooLow',
    'deadlineTooShort',
    'missingInformation',
    'other',
    'notes'
  );
}

export function* rejectDesignBid(
  this: RejectDesignBidContext
): AsyncIterableIterator<void> {
  const { bidId } = this.params;
  const { userId } = this.state;
  const { body } = this.request;

  const bid: Bid = yield BidsDAO.findById(bidId);
  this.assert(bid, 404, `Bid not found with ID ${bidId}`);
  const quote: PricingQuote = yield PricingQuotesDAO.findById(bid.quoteId);

  if (!quote) {
    this.throw(`Quote not found with ID ${bid.quoteId}`);
    return;
  }

  this.assert(quote.designId, 400, 'Quote does not have a design');
  const collaborator: Collaborator = yield CollaboratorsDAO.findByDesignAndUser(
    quote.designId!,
    userId
  );
  this.assert(
    collaborator,
    403,
    'You may only reject a bid you have been assigned to'
  );

  if (body && isRejectionReasons(body)) {
    yield BidRejectionsDAO.create({ bidId: bid.id, ...body });
  } else {
    return this.throw('Bid rejection reasons are required', 400);
  }

  yield DesignEventsDAO.create({
    actorId: userId,
    bidId: bid.id,
    createdAt: new Date(),
    designId: quote.designId!,
    id: uuid.v4(),
    quoteId: bid.quoteId,
    targetId: null,
    type: 'REJECT_SERVICE_BID'
  });

  if (collaborator.role === 'PREVIEW') {
    yield CollaboratorsDAO.deleteById(collaborator.id);
  }

  yield NotificationsService.sendPartnerRejectServiceBidNotification({
    actorId: this.state.userId,
    bidId,
    designId: quote.designId!
  });

  this.status = 204;
}

router.get('/', requireAuth, listBids);
router.get('/unpaid/:userId', requireAdmin, getUnpaidBidsByUserId);

router.put('/:bidId/assignees/:userId', requireAdmin, assignBidToPartner);
router.get('/:bidId/assignees', requireAdmin, listBidAssignees);
router.del('/:bidId/assignees/:userId', requireAdmin, removeBidFromPartner);

router.post('/:bidId/accept', requireAuth, acceptDesignBid);
router.post('/:bidId/reject', requireAuth, rejectDesignBid);

export default router.routes();
