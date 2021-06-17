import Router from "koa-router";
import convert from "koa-convert";
import Knex from "knex";
import { z } from "zod";

import InvalidDataError from "../../errors/invalid-data";
import StripeError from "../../errors/stripe";
import requireAuth = require("../../middleware/require-auth");
import db from "../../services/db";
import {
  canAccessCollectionInRequestBody,
  canCheckOutCollection,
} from "../../middleware/can-access-collection";
import createAndPayInvoice from "../../services/payment";
import { Permissions } from "../../services/get-permissions";
import { transitionCheckoutState } from "../../services/approval-step-state";
import { createFromAddress } from "../../dao/invoice-addresses";
import Invoice from "../../domain-objects/invoice";
import { trackEvent, trackTime } from "../../middleware/tracking";
import { createQuotePayloadSchema } from "../../services/generate-pricing-quote/types";
import { StrictContext } from "../../router-context";
import { sendMessage as sendApiWorkerMessage } from "../../workers/api-worker/send-message";
import { CollectionDb } from "../../components/collections/types";
import filterError = require("../../services/filter-error");
import InsufficientPlanError from "../../errors/insufficient-plan";
import { generateUpgradeBodyDueToMissingSubscription } from "../../components/teams";

const router = new Router();

const payQuoteBodySchema = z.object({
  addressId: z.string(),
  createQuotes: z.array(createQuotePayloadSchema),
  collectionId: z.string(),
  paymentMethodTokenId: z.string().optional().nullable(),
});

interface PayQuoteContext extends StrictContext<Invoice> {
  state: AuthedState & { collection: CollectionDb; permissions: Permissions };
}

async function payQuote(ctx: PayQuoteContext) {
  const bodyResult = payQuoteBodySchema.safeParse(ctx.request.body);
  ctx.assert(bodyResult.success, 400, "Request does not match schema");

  const { data: body } = bodyResult;
  const { userId, collection } = ctx.state;

  const trackEventPrefix = "quotePayments/payQuote";
  trackEvent(ctx, `${trackEventPrefix}/BEGIN`, {
    body,
    userId,
    collectionId: collection.id,
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    const invoiceAddressId = body.addressId
      ? (await createFromAddress(trx, body.addressId)).id
      : null;

    const invoice = await trackTime(
      ctx,
      `${trackEventPrefix}/payInvoiceWithNewPaymentMethod`,
      () =>
        createAndPayInvoice(
          trx,
          body.createQuotes,
          body.paymentMethodTokenId,
          userId,
          collection,
          invoiceAddressId
        )
          .catch(
            filterError(InvalidDataError, (err: InvalidDataError) => {
              ctx.throw(400, err.message);
            })
          )
          .catch(
            filterError(StripeError, (err: StripeError) => {
              ctx.throw(400, err.message);
            })
          )
          .catch(
            filterError(InsufficientPlanError, async () => {
              if (!collection.teamId) {
                ctx.throw(404, "Collection is not in a team");
              }

              ctx.throw(
                402,
                generateUpgradeBodyDueToMissingSubscription(collection.teamId)
              );
            })
          )
    );

    await transitionCheckoutState(trx, collection.id);

    await trackTime(
      ctx,
      `${trackEventPrefix}/postProcessQuoteInApiWorker`,
      () =>
        sendApiWorkerMessage({
          type: "POST_PROCESS_QUOTE_PAYMENT",
          deduplicationId: invoice.id,
          keys: {
            invoiceId: invoice.id,
            userId,
            collectionId: collection.id,
          },
        })
    );

    ctx.body = invoice;
    ctx.status = 201;
  });
}

router.post(
  "/",
  requireAuth,
  canAccessCollectionInRequestBody,
  canCheckOutCollection,
  convert.back(payQuote)
);

export = router.routes();
