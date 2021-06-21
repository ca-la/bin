import Knex from "knex";
import uuid from "node-uuid";

import { db, sandbox } from "./fresh";
import { costCollection } from "./cost-collection";
import { create as createAddress } from "../dao/addresses";
import * as PricingQuotesDAO from "../dao/pricing-quotes";
import createAndPayInvoice from "../services/payment";
import { transitionCheckoutState } from "../services/approval-step-state";
import { postProcessQuotePayment } from "../workers/api-worker/tasks";
import * as StripeAPI from "../services/stripe/api";
import * as AttachSourceService from "../services/stripe/attach-source";
import * as StripeService from "../services/stripe";
import { createFromAddress } from "../dao/invoice-addresses";

export async function checkout(generatePricing: boolean = true) {
  const {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    user,
  } = await costCollection(generatePricing);
  const quoteRequests = [
    { designId: collectionDesigns[0].id, units: 300 },
    { designId: collectionDesigns[1].id, units: 200 },
  ];
  const address = await createAddress({
    companyName: "CALA",
    addressLine1: "42 Wallaby Way",
    addressLine2: "",
    city: "Sydney",
    region: "NSW",
    country: "AU",
    postCode: "RG41 2PE",
    userId: user.designer.user.id,
  });
  const invoiceAddress = await db.transaction((trx: Knex.Transaction) =>
    createFromAddress(trx, address.id)
  );

  const stripeStubs = {
    createCustomer: sandbox().stub(StripeAPI, "createCustomer").resolves({
      id: "a-stripe-customer-id",
    }),
    attachSource: sandbox().stub(AttachSourceService, "default").resolves({
      id: "a-source-id",
      last4: "XXXX",
    }),
    charge: sandbox().stub(StripeService, "charge").resolves({
      id: uuid.v4(),
    }),
  };
  const invoice = await db.transaction(async (trx: Knex.Transaction) =>
    createAndPayInvoice(
      trx,
      quoteRequests,
      "a-payment-method-token",
      user.designer.user.id,
      collection,
      invoiceAddress.id
    )
  );
  const [design1Quotes, design2Quotes] = await Promise.all([
    PricingQuotesDAO.findByDesignId(collectionDesigns[0].id),
    PricingQuotesDAO.findByDesignId(collectionDesigns[1].id),
  ]);

  if (!design1Quotes || !design2Quotes) {
    throw new Error("Could not find the quotes created during checkout");
  }

  await db.transaction((trx: Knex.Transaction) =>
    transitionCheckoutState(trx, collection.id)
  );

  await postProcessQuotePayment({
    type: "POST_PROCESS_QUOTE_PAYMENT",
    deduplicationId: invoice.id,
    keys: {
      invoiceId: invoice.id,
      userId: user.designer.user.id,
      collectionId: collection.id,
    },
  });

  return {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    invoice,
    quotes: [...design1Quotes, ...design2Quotes],
    user,
    stripeStubs,
  };
}
