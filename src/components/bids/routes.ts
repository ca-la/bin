import Router from "koa-router";
import uuid from "node-uuid";
import { omit } from "lodash";

import Bid, {
  isBidSortByParam,
  BidCreationPayload,
  isBidCreationPayload,
} from "./domain-object";
import Collaborator from "../collaborators/types";
import ProductDesign = require("../product-designs/domain-objects/product-design");
import { PricingQuote } from "../../domain-objects/pricing-quote";
import * as UsersDAO from "../../components/users/dao";
import * as BidRejectionsDAO from "../bid-rejections/dao";
import * as BidsDAO from "./dao";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import ProductDesignsDAO from "../product-designs/dao";
import { create as createDesignEvent } from "../design-events/dao";
import { DuplicateAcceptRejectError } from "../design-events/errors";
import * as CollaboratorsDAO from "../collaborators/dao";
import requireAdmin = require("../../middleware/require-admin");
import requireAuth = require("../../middleware/require-auth");
import useTransaction from "../../middleware/use-transaction";
import { typeGuard } from "../../middleware/type-guard";
import * as NotificationsService from "../../services/create-notifications";
import { isExpired } from "./services/is-expired";
import { createBid } from "../../services/create-bid";
import { BidRejection } from "../bid-rejections/domain-object";
import {
  hasProperties,
  hasOnlyProperties,
} from "../../services/require-properties";
import { PartnerPayoutLog } from "../partner-payouts/domain-object";
import { payOutPartner } from "../../services/pay-out-partner";
import filterError = require("../../services/filter-error");
import { templateDesignEvent } from "../design-events/types";
import InvalidDataError from "../../errors/invalid-data";
import ConflictError from "../../errors/conflict";

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
    design,
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

function* createAndAssignBid(
  this: TrxContext<AuthedContext<BidCreationPayload>>
) {
  const { body }: { body: BidCreationPayload } = this.request;
  const { trx, userId } = this.state;

  const created = yield createBid(trx, uuid.v4(), userId, body)
    .catch(
      filterError(InvalidDataError, (err: InvalidDataError) => {
        this.throw(400, err.message);
      })
    )
    .catch(
      filterError(ConflictError, (err: ConflictError) => {
        this.throw(409, err.message);
      })
    );

  this.body = created;
  this.status = 201;
}

function* listAllBids(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { limit, offset, state }: GetListQuery = this.query;
  const { trx } = this.state;

  if (!limit || !offset) {
    this.throw(400, "Must specify a limit and offset when fetching all bids!");
  }

  const bids = yield BidsDAO.findAll(trx, { limit, offset, state });
  this.body = bids;
  this.status = 200;
}

function* listBidsByAssignee(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { state, userId, sortBy = "ACCEPTED" } = this.query;
  const { trx } = this.state;

  if (!userId) {
    this.throw(400, "You must specify the user to retrieve bids for");
  }

  if (!isBidSortByParam(sortBy)) {
    this.throw(
      400,
      `Invalid sortBy query parameter "${sortBy}". Must be "ACCEPTED" or "DUE".`
    );
  }

  let bids: Bid[] = [];
  switch (state) {
    case "ACCEPTED":
      bids = yield BidsDAO.findAcceptedByTargetId(trx, userId, sortBy);
      break;

    case "ACTIVE":
      bids = yield BidsDAO.findActiveByTargetId(trx, userId, sortBy);
      break;

    case "COMPLETED":
      bids = yield BidsDAO.findCompletedByTargetId(trx, userId, sortBy);
      break;

    case "EXPIRED":
      bids = yield BidsDAO.findOpenByTargetId(
        trx,
        userId,
        sortBy
      ).then((openBids: Bid[]): Bid[] => openBids.filter(isExpired));
      break;

    case "REJECTED":
      bids = yield BidsDAO.findRejectedByTargetId(trx, userId, sortBy);
      break;

    case "OPEN":
    case undefined:
      bids = yield BidsDAO.findOpenByTargetId(
        trx,
        userId,
        sortBy
      ).then((openBids: Bid[]): Bid[] => openBids.filter(not(isExpired)));
      break;

    default:
      this.throw(400, "Invalid status query");
  }
  const ioBids: IOBid[] = yield attachDesignsToBids(bids);

  this.body = ioBids;
  this.status = 200;
}

function* listBids(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.query;
  const isAdmin = this.state.role === "ADMIN";

  if (isAdmin && !userId) {
    yield listAllBids;
  } else if (isAdmin || userId === this.state.userId) {
    yield listBidsByAssignee;
  } else {
    this.throw(
      403,
      "You must either be an admin or retrieve bids for your own user!"
    );
  }
}

function* getUnpaidBidsByUserId(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { userId } = this.params;
  const { trx } = this.state;

  const bids = yield BidsDAO.findUnpaidByUserId(trx, userId);
  this.body = bids;
  this.status = 200;
}

function* listBidAssignees(this: AuthedContext): Iterator<any, any, any> {
  const { bidId } = this.params;
  const assignees = yield UsersDAO.findByBidId(bidId);

  this.body = assignees;
  this.status = 200;
}

function* removeBidFromPartner(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { bidId, userId } = this.params;
  const { trx } = this.state;

  const bid = yield BidsDAO.findById(trx, bidId);
  if (!bid) {
    this.throw(404, `No Bid found for ID: ${bidId}`);
  }

  const design = yield ProductDesignsDAO.findByQuoteId(bid.quoteId);
  if (!design) {
    this.throw(404, `No Design found for Quote with ID: ${bid.quoteId}`);
  }

  const target = yield UsersDAO.findById(userId, trx);
  if (!target) {
    this.throw(404, `No User found for ID: ${userId}`);
  }

  yield createDesignEvent(trx, {
    ...templateDesignEvent,
    actorId: this.state.userId,
    bidId,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    targetId: target.id,
    type: "REMOVE_PARTNER",
  });

  yield CollaboratorsDAO.cancelForDesignAndPartner(design.id, target.id);
  this.status = 204;
}

interface AcceptDesignBidContext extends AuthedContext {
  params: {
    bidId: string;
  };
}

export function* acceptDesignBid(
  this: TrxContext<AcceptDesignBidContext>
): Iterator<any, any, any> {
  const { bidId } = this.params;
  const { userId, trx } = this.state;

  const bid: Bid = yield BidsDAO.findById(trx, bidId);
  this.assert(bid, 404, `Bid not found with ID ${bidId}`);
  const quote: PricingQuote = yield PricingQuotesDAO.findById(bid.quoteId);

  if (!quote) {
    this.throw(`Quote not found with ID ${bid.quoteId}`);
  }

  this.assert(quote.designId, 400, "Quote does not have a design");
  const collaborator: Collaborator = yield CollaboratorsDAO.findByDesignAndUser(
    quote.designId!,
    userId
  );
  this.assert(
    collaborator,
    403,
    "You may only accept a bid you have been assigned to"
  );

  const maybeIOBid = yield attachDesignToBid(bid);
  if (!maybeIOBid) {
    this.throw(400, `Design for bid ${bid.id} does not exist!`);
  }

  yield createDesignEvent(trx, {
    ...templateDesignEvent,
    actorId: userId,
    bidId: bid.id,
    createdAt: new Date(),
    designId: quote.designId!,
    id: uuid.v4(),
    quoteId: bid.quoteId,
    type: "ACCEPT_SERVICE_BID",
  }).catch(
    filterError(
      DuplicateAcceptRejectError,
      (err: DuplicateAcceptRejectError) => {
        this.throw(400, err.message);
      }
    )
  );

  yield CollaboratorsDAO.update(collaborator.id, {
    cancelledAt: null,
    role: "PARTNER",
  });
  yield NotificationsService.sendPartnerAcceptServiceBidNotification(
    quote.designId!,
    this.state.userId
  );

  this.status = 200;
  this.body = maybeIOBid;
}

interface RejectDesignBidContext extends AuthedContext {
  params: {
    bidId: string;
  };
  body: Unsaved<BidRejection>;
}

function isRejectionReasons(data: object): data is Unsaved<BidRejection> {
  return hasOnlyProperties(
    data,
    "createdBy",
    "priceTooLow",
    "deadlineTooShort",
    "missingInformation",
    "other",
    "notes"
  );
}

export function* rejectDesignBid(
  this: TrxContext<RejectDesignBidContext>
): Iterator<any, any, any> {
  const { bidId } = this.params;
  const { trx, userId } = this.state;
  const { body } = this.request;

  const bid: Bid = yield BidsDAO.findById(trx, bidId);
  this.assert(bid, 404, `Bid not found with ID ${bidId}`);
  const quote: PricingQuote = yield PricingQuotesDAO.findById(bid.quoteId);

  if (!quote) {
    this.throw(`Quote not found with ID ${bid.quoteId}`);
  }

  this.assert(quote.designId, 400, "Quote does not have a design");
  const collaborator: Collaborator = yield CollaboratorsDAO.findByDesignAndUser(
    quote.designId!,
    userId,
    trx
  );
  this.assert(
    collaborator,
    403,
    "You may only reject a bid you have been assigned to"
  );

  if (body && isRejectionReasons(body)) {
    yield BidRejectionsDAO.create({ ...body, bidId: bid.id }, trx);
  } else {
    this.throw("Bid rejection reasons are required", 400);
  }

  yield createDesignEvent(trx, {
    ...templateDesignEvent,
    actorId: userId,
    bidId: bid.id,
    createdAt: new Date(),
    designId: quote.designId!,
    id: uuid.v4(),
    quoteId: bid.quoteId,
    type: "REJECT_SERVICE_BID",
  });

  if (collaborator.role === "PREVIEW") {
    yield CollaboratorsDAO.deleteById(collaborator.id);
  }

  yield NotificationsService.sendPartnerRejectServiceBidNotification({
    actorId: this.state.userId,
    bidId,
    designId: quote.designId!,
  });

  this.status = 204;
}

interface GetByIdContext extends AuthedContext {
  params: {
    bidId: string;
  };
}

function* getById(this: TrxContext<GetByIdContext>): Iterator<any, any, any> {
  const { bidId } = this.params;
  const { role, userId, trx } = this.state;
  const bid =
    role === "ADMIN"
      ? yield BidsDAO.findById(trx, bidId)
      : yield BidsDAO.findByBidIdAndUser(trx, bidId, userId);

  if (bid) {
    this.body = bid;
    this.status = 200;
  } else {
    this.throw(404);
  }
}

interface PayOutPartnerContext extends AuthedContext {
  params: {
    bidId: string;
  };
}

type UninsertedPayoutLog = Omit<
  UninsertedWithoutShortId<PartnerPayoutLog>,
  "initiatorUserId"
>;

interface PayoutRequest extends UninsertedPayoutLog {
  stripeSourceType?: string;
}

export function isPayoutRequest(data: object): data is PayoutRequest {
  return hasProperties(
    data,
    "payoutAmountCents",
    "message",
    "isManual",
    "bidId"
  );
}

function* postPayOut(
  this: TrxContext<PayOutPartnerContext>
): Iterator<any, any, any> {
  const { bidId } = this.params;
  if (!isPayoutRequest(this.request.body)) {
    this.throw(400, "Request does not match Payout Request");
  }

  const {
    payoutAccountId,
    isManual,
    message,
    stripeSourceType,
  } = this.request.body;
  const { trx } = this.state;

  this.assert(message, 400, "Message is required");
  if (!isManual) {
    this.assert(payoutAccountId, 400, "Missing payout account ID");
  }
  const payoutLog: UninsertedWithoutShortId<PartnerPayoutLog> = {
    ...omit(this.request.body, "stripeSourceType"),
    bidId,
    initiatorUserId: this.state.userId,
  };

  yield payOutPartner(trx, payoutLog, stripeSourceType);

  this.status = 204;
}

router.post(
  "/",
  requireAdmin,
  useTransaction,
  typeGuard(isBidCreationPayload),
  createAndAssignBid
);
router.get("/", requireAuth, useTransaction, listBids);
router.get(
  "/unpaid/:userId",
  requireAdmin,
  useTransaction,
  getUnpaidBidsByUserId
);

router.get("/:bidId", requireAuth, useTransaction, getById);
router.get("/:bidId/assignees", requireAdmin, listBidAssignees);
router.del(
  "/:bidId/assignees/:userId",
  requireAdmin,
  useTransaction,
  removeBidFromPartner
);

router.post("/:bidId/accept", requireAuth, useTransaction, acceptDesignBid);
router.post("/:bidId/reject", requireAuth, useTransaction, rejectDesignBid);
router.post(
  "/:bidId/pay-out-to-partner",
  requireAdmin,
  useTransaction,
  postPayOut
);

export default router.routes();
