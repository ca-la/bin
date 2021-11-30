import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import StripeError = require("../../errors/stripe");
import InvalidDataError from "../../errors/invalid-data";
import * as attachSource from "../../services/stripe/attach-source";
import { CreditsDAO, CreditType } from "../../components/credits";
import * as InvoicesDAO from "../../dao/invoices";
import { create as createAddress } from "../../dao/addresses";
import { findByAddressId } from "../../dao/invoice-addresses";
import FinancingAccountsDAO from "../../components/financing-accounts/dao";
import * as InvoicePaymentsDAO from "../../components/invoice-payments/dao";
import * as LineItemsDAO from "../../dao/line-items";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";
import * as RequireUserSubscription from "../../middleware/require-user-subscription";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import EmailService = require("../../services/email");
import Stripe = require("../../services/stripe");
import { authHeader, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { createStorefront } from "../../services/create-storefront";
import { ProviderName } from "../../components/storefronts/tokens/domain-object";
import * as CreateShopifyProducts from "../../services/create-shopify-products";
import { ApprovalStepState } from "../../components/approval-steps/types";
import createDesign from "../../services/create-design";
import * as IrisService from "../../components/iris/send-message";
import * as ApiWorker from "../../workers/api-worker/send-message";
import * as RequestService from "../../services/stripe/make-request";
import { InvoicePayment } from "../../components/invoice-payments/domain-object";
import DesignEventsDAO from "../../components/design-events/dao";
import { DesignEventWithMeta } from "../../components/design-events/types";
import { postProcessQuotePayment } from "../../workers/api-worker/tasks/post-process-quote-payment";
import InvoiceFeesDAO from "../../components/invoice-fee/dao";
import { InvoiceFeeType } from "../../components/invoice-fee/types";
import { checkout } from "../../test-helpers/checkout-collection";
import { costCollection } from "../../test-helpers/cost-collection";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");

const ADDRESS_BLANK = {
  companyName: "CALA",
  addressLine1: "42 Wallaby Way",
  addressLine2: "",
  city: "Sydney",
  region: "NSW",
  country: "AU",
  postCode: "RG41 2PE",
};

const CREDIT_AMOUNT_CENTS = 200_00;

function setupStubs() {
  sandbox()
    .stub(RequestService, "default")
    .resolves({ id: "a-stripe-customer-id" }); // POST /customers
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(RequireUserSubscription, "default").resolves();
  const charge = sandbox().stub(Stripe, "charge").resolves({ id: "chargeId" });
  const email = sandbox().stub(EmailService, "enqueueSend").resolves();
  const sendApiWorkerMessage = sandbox()
    .stub(ApiWorker, "sendMessage")
    .resolves();
  const iris = sandbox().stub(IrisService, "sendMessage").resolves();
  return { charge, email, sendApiWorkerMessage, iris };
}

async function setup() {
  const stubs = setupStubs();
  const {
    user: { designer, admin },
    collection,
    collectionDesigns,
    team,
  } = await costCollection();

  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: designer.user.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: CREDIT_AMOUNT_CENTS,
      createdBy: admin.user.id,
      description: "Manual credit grant",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    });
  });

  return {
    stubs,
    user: designer.user,
    session: designer.session,
    designs: collectionDesigns,
    address,
    collection,
    team,
  };
}

test("/quote-payments POST generates quotes, payment method, invoice, lineItems, and charges", async (t: Test) => {
  const {
    session,
    stubs,
    collection,
    designs: [d1, d2],
    team,
    address,
    user,
  } = await setup();
  await db.transaction((trx: Knex.Transaction) =>
    FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 500000,
      feeBasisPoints: 1000,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    })
  );
  const paymentMethodTokenId = uuid.v4();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: d1.id,
          units: 300,
        },
        {
          designId: d2.id,
          units: 200,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  await postProcessQuotePayment({
    type: "POST_PROCESS_QUOTE_PAYMENT",
    deduplicationId: body.id,
    keys: {
      invoiceId: body.id,
      userId: user.id,
      collectionId: collection.id,
    },
  });

  t.equal(
    postResponse.status,
    201,
    "successfully pays the invoice created by quotes"
  );

  t.equals(body.isPaid, true, "Invoice is paid");
  t.equals(
    body.collectionId,
    collection.id,
    "Invoice has correct collection Id set"
  );
  const invoiceAddress = await findByAddressId(address.id);
  t.deepEqual(
    omit(invoiceAddress, "id", "createdAt", "updatedAt", "addressId"),
    omit(address, "id", "createdAt", "updatedAt"),
    "Invoice address matches the original address"
  );
  t.equals(invoiceAddress!.addressId, address.id);

  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 2, "Line Item exists for designs");
  t.equals(lineItems[0].designId, d1.id, "Line Item has correct design");
  t.equals(lineItems[1].designId, d2.id, "Line Item has correct design");

  const fees = await InvoiceFeesDAO.findByInvoiceId(db, body.id);
  t.equals(fees.length, 1, "Invoice Fees exist for designs");
  t.equals(fees[0].invoiceId, body.id, "Fee has correct invoice ID");
  t.equals(fees[0].type, InvoiceFeeType.FINANCING, "Fee has correct type");
  t.equals(
    fees[0].totalCents,
    Math.round((5_000_00 / 1.1) * 0.1),
    "Fee has correct amount"
  );

  const payments = await InvoicePaymentsDAO.findByInvoiceId(body.id);
  t.equals(
    payments.reduce(
      (total: number, payment: InvoicePayment) => total + payment.totalCents,
      0
    ),
    body.totalPaid,
    "invoice payments sum to the invoice total"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.paymentMethodId !== null && payment.stripeChargeId !== null
    ),
    "has a stripe payment"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId !== null && payment.creditTransactionId !== null
    ),
    "has a user credit payment"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId === null && payment.creditTransactionId !== null
    ),
    "has a team financing credit payment"
  );

  t.assert(stubs.charge.calledOnce, "Stripe was charged");
  t.equals(
    stubs.charge.args[0][0].amountCents,
    Math.round(14_458_00 * 1.2) - // Add production fee
    CREDIT_AMOUNT_CENTS - // Remove credit
      Math.round(5_000_00 / 1.1), // Remove financed amount
    "Stripe charged correct amount"
  );

  const createdQuoteDesigns = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.findCommitQuoteByInvoiceEvents(trx, body.id)
  );
  t.deepEquals(
    createdQuoteDesigns.map((event: DesignEventWithMeta) => event.type),
    ["COMMIT_QUOTE", "COMMIT_QUOTE"],
    "design events were created for quotes"
  );

  const realtimeDesignEvents = stubs.iris.args.filter(
    (arg: any) => arg[0].type === "design-event/created"
  );
  const realtimeStepUpdates = stubs.iris.args.filter(
    (arg: any) => arg[0].type === "approval-step/updated"
  );
  const realtimeStepListUpdates = stubs.iris.args.filter(
    (arg: any) => arg[0].type === "approval-step-list/updated"
  );
  const realtimeCollectionStatus = stubs.iris.args.filter(
    (arg: any) => arg[0].type === "collection/status-updated"
  );
  t.equals(
    realtimeDesignEvents.filter(
      (message: any) => message[0].resource.type === "COMMIT_QUOTE"
    ).length,
    2,
    "Realtime message emitted for design checkout"
  );

  t.equals(
    realtimeStepUpdates.length,
    0,
    "No Realtime message emitted for single approval step"
  );
  t.equals(
    // all collection steps are update via single realtime request
    // first is to update checkout steps and make next steps current
    // second to update all steps as due date has been updated (api-worker)
    realtimeStepListUpdates.length,
    2,
    "Realtime message emitted for list approval step"
  );
  t.equals(
    // + 2 CHECKOUT STEPS being COMPLETED
    realtimeStepListUpdates[0][0].resource.length,
    2,
    "Realtime message emitted for approval step status"
  );
  t.equals(
    // (4 steps receiving due dates * 2 designs)
    realtimeStepListUpdates[1][0].resource.length,
    8,
    "Realtime message emitted for approval step status"
  );
  t.equals(
    realtimeCollectionStatus.length,
    1,
    "Realtime message emitted for collection status"
  );
  await db.transaction(async (trx: Knex.Transaction) => {
    const cutAndSewApprovalSteps = await ApprovalStepsDAO.findByDesign(
      trx,
      d1.id
    );
    t.equals(cutAndSewApprovalSteps[0].state, ApprovalStepState.COMPLETED);
    t.equals(cutAndSewApprovalSteps[1].state, ApprovalStepState.BLOCKED);
    t.equals(cutAndSewApprovalSteps[2].state, ApprovalStepState.BLOCKED);
    t.equals(cutAndSewApprovalSteps[3].state, ApprovalStepState.UNSTARTED);

    const cutAndSewSubmissions = await ApprovalStepSubmissionsDAO.findByDesign(
      trx,
      d1.id
    );
    t.is(
      cutAndSewSubmissions.length,
      10,
      "adds cut and sew approval submissions"
    );

    const blankApprovalSteps = await ApprovalStepsDAO.findByDesign(trx, d2.id);
    t.equals(blankApprovalSteps[0].state, ApprovalStepState.COMPLETED);
    t.equals(blankApprovalSteps[1].state, ApprovalStepState.BLOCKED);
    t.equals(blankApprovalSteps[2].state, ApprovalStepState.BLOCKED);
    t.equals(blankApprovalSteps[3].state, ApprovalStepState.UNSTARTED);

    const blankSubmissions = await ApprovalStepSubmissionsDAO.findByDesign(
      trx,
      d2.id
    );
    t.is(blankSubmissions.length, 5, "adds blank approval submissions");
  });
  t.deepEqual(
    stubs.sendApiWorkerMessage.args[0],
    [
      {
        type: "POST_PROCESS_QUOTE_PAYMENT",
        deduplicationId: body.id,
        keys: {
          invoiceId: body.id,
          userId: user.id,
          collectionId: collection.id,
        },
      },
    ],
    "calls api-worker to postprocess the quote payment"
  );

  t.equals(
    await CreditsDAO.getCreditAmount(user.id),
    0,
    "Spends all the credits"
  );

  t.equals(
    (await FinancingAccountsDAO.findActive(db, { teamId: team.id }))!
      .availableBalanceCents,
    0,
    "Reduces available credit"
  );
});

test("/quote-payments POST with full financing", async (t: Test) => {
  const {
    stubs,
    session,
    collection,
    designs: [d1, d2],
    team,
    address,
    user,
  } = await setup();
  await db.transaction((trx: Knex.Transaction) =>
    FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 25_000_00,
      feeBasisPoints: 10_00,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    })
  );
  const paymentMethodTokenId = uuid.v4();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: d1.id,
          units: 300,
        },
        {
          designId: d2.id,
          units: 200,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  t.equal(
    postResponse.status,
    201,
    "successfully pays the invoice created by quotes"
  );

  t.equals(body.isPaid, true, "Invoice is paid");

  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 2, "Line Item exists for designs");
  t.equals(lineItems[0].designId, d1.id, "Line Item has correct design");
  t.equals(lineItems[1].designId, d2.id, "Line Item has correct design");

  const payments = await InvoicePaymentsDAO.findByInvoiceId(body.id);
  t.equals(
    payments.reduce(
      (total: number, payment: InvoicePayment) => total + payment.totalCents,
      0
    ),
    body.totalPaid,
    "invoice payments sum to the invoice total"
  );
  t.false(
    payments.some(
      (payment: InvoicePayment) =>
        payment.paymentMethodId !== null && payment.stripeChargeId !== null
    ),
    "has no stripe payment"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId !== null && payment.creditTransactionId !== null
    ),
    "has a user credit payment"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId === null && payment.creditTransactionId !== null
    ),
    "has a team financing credit payment"
  );

  t.equals(stubs.charge.callCount, 0, "Stripe was not charged");
  t.deepEqual(
    stubs.sendApiWorkerMessage.args[0],
    [
      {
        type: "POST_PROCESS_QUOTE_PAYMENT",
        deduplicationId: body.id,
        keys: {
          invoiceId: body.id,
          userId: user.id,
          collectionId: collection.id,
        },
      },
    ],
    "calls api-worker to postprocess the quote payment"
  );

  t.equals(
    await CreditsDAO.getCreditAmount(user.id),
    0,
    "Spends all the user credits"
  );

  t.equals(
    (await FinancingAccountsDAO.findActive(db, { teamId: team.id }))!
      .availableBalanceCents,
    25_000_00 + CREDIT_AMOUNT_CENTS - body.totalCents,
    "Reduces available team financing credit"
  );
});

test("/quote-payments POST with full financing and full credit", async (t: Test) => {
  const {
    session,
    stubs,
    collection,
    designs: [d1, d2],
    team,
    address,
    user,
  } = await setup();
  await db.transaction(async (trx: Knex.Transaction) => {
    await FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 25_000_00,
      feeBasisPoints: 10_00,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    });
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 25_000_00,
      createdBy: user.id,
      description: "Manual credit grant",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
  });
  const paymentMethodTokenId = uuid.v4();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: d1.id,
          units: 300,
        },
        {
          designId: d2.id,
          units: 200,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  t.equal(
    postResponse.status,
    201,
    "successfully pays the invoice created by quotes"
  );

  t.equals(body.isPaid, true, "Invoice is paid");

  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 2, "Line Item exists for designs");
  t.equals(lineItems[0].designId, d1.id, "Line Item has correct design");
  t.equals(lineItems[1].designId, d2.id, "Line Item has correct design");

  const payments = await InvoicePaymentsDAO.findByInvoiceId(body.id);
  t.equals(
    payments.reduce(
      (total: number, payment: InvoicePayment) => total + payment.totalCents,
      0
    ),
    body.totalPaid,
    "invoice payments sum to the invoice total"
  );
  t.false(
    payments.some(
      (payment: InvoicePayment) =>
        payment.paymentMethodId !== null && payment.stripeChargeId !== null
    ),
    "has no stripe payment"
  );
  t.true(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId !== null && payment.creditTransactionId !== null
    ),
    "has a user credit payment"
  );
  t.false(
    payments.some(
      (payment: InvoicePayment) =>
        payment.creditUserId === null && payment.creditTransactionId !== null
    ),
    "has no team financing credit payment"
  );

  t.equals(stubs.charge.callCount, 0, "Stripe was not charged");
  t.deepEqual(
    stubs.sendApiWorkerMessage.args,
    [
      [
        {
          type: "POST_PROCESS_QUOTE_PAYMENT",
          deduplicationId: body.id,
          keys: {
            invoiceId: body.id,
            userId: user.id,
            collectionId: collection.id,
          },
        },
      ],
    ],
    "calls api-worker to postprocess the quote payment"
  );

  t.equals(
    await CreditsDAO.getCreditAmount(user.id),
    25_200_00 - body.totalCents,
    "Reduces available user credits"
  );

  t.equals(
    (await FinancingAccountsDAO.findActive(db, { teamId: team.id }))!
      .availableBalanceCents,
    25_000_00,
    "Does not reduce available team financing credit"
  );
});

test("/quote-payments POST does not generate quotes, payment method, invoice, lineItems when team missing active subscription", async (t: Test) => {
  const { collection, user, session, designs, team } = await setup();
  const paymentMethodTokenId = uuid.v4();
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const active = await SubscriptionsDAO.findActiveByTeamId(trx, team.id);
    if (!active) {
      throw new Error("Could not find subscription after setup. Unexpected");
    }

    await SubscriptionsDAO.update(active.id, { cancelledAt: new Date() }, trx);
  });

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: designs[0].id,
          units: 300,
        },
        {
          designId: designs[1].id,
          units: 200,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  t.equal(postResponse.status, 402, "response returns Payment Needed error");
  t.equal(
    body.actionUrl,
    `/subscribe?upgradingTeamId=${team.id}`,
    "returns a link to the upgrade page"
  );

  const invoices = await InvoicesDAO.findByUser(user.id);
  t.deepEquals(invoices, [], "No invoice exists for design");
});

test("/quote-payments POST does not generate quotes, payment method, invoice, lineItems on payment failure", async (t: Test) => {
  const {
    stubs,
    session,
    collection,
    designs: [design],
    user,
    address,
  } = await setup();

  stubs.charge.rejects(
    new StripeError({ message: "Could not process payment" })
  );

  const paymentMethodTokenId = uuid.v4();

  const [postResponse] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  t.equal(postResponse.status, 400, "response errors");

  const invoices = await InvoicesDAO.findByUser(user.id);
  t.deepEquals(invoices, [], "No invoice exists for design");
  t.assert(stubs.charge.calledOnce, "Stripe was called");
});

test("POST /quote-payments with full credit", async (t: Test) => {
  const {
    stubs,
    user,
    session,
    address,
    collection,
    designs: [design],
  } = await setup();

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 10000000,
      createdBy: user.id,
      description: "Free money",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
  });

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300,
        },
      ],
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  const invoiceAddress = await findByAddressId(address.id);
  t.deepEqual(
    omit(invoiceAddress, "id", "createdAt", "updatedAt", "addressId"),
    omit(address, "id", "createdAt", "updatedAt"),
    "Invoice address matches the original address"
  );
  t.equals(invoiceAddress!.addressId, address.id);

  t.equal(postResponse.status, 201, "successfully creates the invoice");
  t.equals(body.isPaid, true, "Invoice is paid");
  t.deepEqual(
    stubs.sendApiWorkerMessage.args[0],
    [
      {
        type: "POST_PROCESS_QUOTE_PAYMENT",
        deduplicationId: body.id,
        keys: {
          invoiceId: body.id,
          userId: user.id,
          collectionId: collection.id,
        },
      },
    ],
    "calls api-worker to postprocess the quote payment"
  );
});

test("POST /quote-payments fails with no payment method with balance due", async (t: Test) => {
  const {
    session,
    collection,
    designs: [design],
    address,
  } = await setup();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300,
        },
      ],
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  t.equal(postResponse.status, 400, "fails to pay the invoice");
  t.equals(
    body.message,
    "Cannot find Stripe payment method token for invoice with balance due"
  );
});

test("POST /quote-payments: with already checked out designs", async (t: Test) => {
  const {
    user: { designer },
    collection,
    collectionDesigns,
  } = await checkout();

  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: designer.user.id,
  });

  const newDesign = await createDesign({
    productType: "A product type",
    title: "A new design in a checked out collection",
    userId: designer.user.id,
    collectionIds: [collection.id],
  });

  const paymentMethodTokenId = uuid.v4();

  const [postResponse] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [...collectionDesigns, newDesign].map(
        (d: ProductDesign) => ({
          designId: d.id,
          units: 300,
        })
      ),
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(designer.session.id),
  });

  t.equal(postResponse.status, 400, "response errors");
});

test(
  "/quote-payments POST does not generate quotes," +
    " invoice, lineItems on failure",
  async (t: Test) => {
    const {
      address,
      user,
      session,
      collection,
      designs: [design],
    } = await setup();

    sandbox()
      .stub(LineItemsDAO, "createAll")
      .rejects(new InvalidDataError("Duplicate"));

    const paymentMethodTokenId = uuid.v4();

    const [postResponse] = await post("/quote-payments", {
      body: {
        collectionId: collection.id,
        createQuotes: [
          {
            designId: design.id,
            units: 300,
          },
        ],
        paymentMethodTokenId,
        addressId: address.id,
      },
      headers: authHeader(session.id),
    });

    t.equal(postResponse.status, 400, "response errors");

    const invoice = await InvoicesDAO.findByUser(user.id);
    t.deepEquals(invoice, [], "No invoice exists for design");
  }
);

test("POST /quote-payments creates shopify products if connected to a storefront", async (t: Test) => {
  const createShopifyProductsStub = sandbox()
    .stub(CreateShopifyProducts, "createShopifyProductsForCollection")
    .resolves();
  const {
    address,
    user,
    session,
    collection,
    designs: [d1, d2],
  } = await setup();
  await createStorefront({
    userId: user.id,
    accessToken: "token-foo",
    name: "The Gift Shop",
    baseUrl: "gift.shop",
    providerName: ProviderName.SHOPIFY,
  });
  const paymentMethodTokenId = uuid.v4();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: d1.id,
          units: 300,
        },
        {
          designId: d2.id,
          units: 300,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  await postProcessQuotePayment({
    type: "POST_PROCESS_QUOTE_PAYMENT",
    deduplicationId: body.id,
    keys: {
      invoiceId: body.id,
      userId: user.id,
      collectionId: collection.id,
    },
  });

  t.equal(postResponse.status, 201, "successful payment");
  t.deepEqual(createShopifyProductsStub.firstCall.args.slice(1), [
    user.id,
    collection.id,
  ]);
});

test("POST /quote-payments still succeeds if creates shopify products fails", async (t: Test) => {
  const createShopifyProductsStub = sandbox()
    .stub(CreateShopifyProducts, "createShopifyProductsForCollection")
    .rejects(new Error("Unexpected Error"));

  const {
    address,
    user,
    session,
    collection,
    designs: [d1, d2],
  } = await setup();
  await createStorefront({
    userId: user.id,
    accessToken: "token-foo",
    name: "The Gift Shop",
    baseUrl: "gift.shop",
    providerName: ProviderName.SHOPIFY,
  });
  const paymentMethodTokenId = uuid.v4();

  const [postResponse, body] = await post("/quote-payments", {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: d1.id,
          units: 300,
        },
        {
          designId: d2.id,
          units: 300,
        },
      ],
      paymentMethodTokenId,
      addressId: address.id,
    },
    headers: authHeader(session.id),
  });

  await postProcessQuotePayment({
    type: "POST_PROCESS_QUOTE_PAYMENT",
    deduplicationId: body.id,
    keys: {
      invoiceId: body.id,
      userId: user.id,
      collectionId: collection.id,
    },
  });

  t.equal(postResponse.status, 201, "succesful payment");
  t.equal(createShopifyProductsStub.callCount, 1);
});

test("POST /quote-payments does not allow parallel requests to succeed", async (t: Test) => {
  const {
    address,
    session,
    collection,
    designs: [d1, d2],
  } = await setup();

  function createRequestOptions() {
    return {
      body: {
        collectionId: collection.id,
        createQuotes: [
          {
            designId: d1.id,
            units: 300,
          },
          {
            designId: d2.id,
            units: 200,
          },
        ],
        paymentMethodTokenId: uuid.v4(),
        addressId: address.id,
      },
      headers: authHeader(session.id),
    };
  }

  const [[r0, b0], [r1, b1], [r2, b2]] = await Promise.all([
    post("/quote-payments", createRequestOptions()),
    post("/quote-payments", createRequestOptions()),
    post("/quote-payments", createRequestOptions()),
  ]);

  t.deepEqual(
    [r0.status, r1.status, r2.status].sort(),
    [201, 400, 400],
    "Only one request should succeed"
  );

  const failed = [b0, b1, b2].filter((body: typeof b0) =>
    Boolean(body.message)
  );
  t.equal(failed.length, 2, "Two responses include error messages");
  t.equal(failed[0].message, failed[1].message, "The errors are the same");
  t.equal(
    failed[0].message,
    `There are designs in this collection (${collection.id}) which are in invalid states`,
    "Error message interprets the error type"
  );
});

test("POST /quote-payments does not allow consecutive requests to succeed", async (t: Test) => {
  const {
    address,
    session,
    collection,
    designs: [d1, d2],
  } = await setup();

  function createRequestOptions() {
    return {
      body: {
        collectionId: collection.id,
        createQuotes: [
          {
            designId: d1.id,
            units: 300,
          },
          {
            designId: d2.id,
            units: 200,
          },
        ],
        paymentMethodTokenId: uuid.v4(),
        addressId: address.id,
      },
      headers: authHeader(session.id),
    };
  }

  const [r0] = await post("/quote-payments", createRequestOptions());
  const [r1, b1] = await post("/quote-payments", createRequestOptions());
  const [r2, b2] = await post("/quote-payments", createRequestOptions());

  t.deepEqual(r0.status, 201);
  t.deepEqual(r1.status, 400);
  t.deepEqual(r2.status, 400);

  t.equal(b1.message, b2.message);
  t.equal(
    b1.message,
    `There are designs in this collection (${collection.id}) which are in invalid states`,
    "Error message interprets the error type"
  );
});
