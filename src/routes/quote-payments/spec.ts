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
import * as LineItemsDAO from "../../dao/line-items";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";
import * as RequireUserSubscription from "../../middleware/require-user-subscription";
import createUser from "../../test-helpers/create-user";
import EmailService = require("../../services/email");
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import SlackService = require("../../services/slack");
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
import * as RequestService from "../../services/stripe/make-request";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";

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
  const chargeStub = sandbox()
    .stub(Stripe, "charge")
    .resolves({ id: "chargeId" });
  const emailStub = sandbox().stub(EmailService, "enqueueSend").resolves();
  const slackStub = sandbox().stub(SlackService, "enqueueSend").resolves();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();
  return { chargeStub, emailStub, slackStub, irisStub };
}

async function setup() {
  const { user, session } = await createUser();
  const admin = await createUser({ role: "ADMIN", withSession: false });
  const stubs = setupStubs();

  const { team } = await generateTeam(
    user.id,
    {},
    {},
    { costOfGoodsShareBasisPoints: 2000 }
  );
  const { collection } = await generateCollection({ teamId: team.id });
  const d1 = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const d2 = await createDesign({
    productType: "Another product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: CREDIT_AMOUNT_CENTS,
      createdBy: admin.user.id,
      description: "Manual credit grant",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: d1.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1000,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: d1.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: d2.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "BLANK",
      productType: "TEESHIRT",
    });
  });

  return {
    ...stubs,
    user,
    session,
    designs: [d1, d2],
    address,
    collection,
    team,
  };
}

test("/quote-payments POST generates quotes, payment method, invoice, lineItems, and charges", async (t: Test) => {
  const {
    session,
    slackStub,
    irisStub,
    chargeStub,
    collection,
    designs: [d1, d2],
    address,
    user,
  } = await setup();
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
  t.assert(chargeStub.calledOnce, "Stripe was charged");
  t.equals(
    chargeStub.args[0][0].amountCents,
    14_458_00 * 1.2 - CREDIT_AMOUNT_CENTS,
    "Charge sum includes the production fee"
  );

  const realtimeDesignEvents = irisStub.args.filter(
    (arg: any) => arg[0].type === "design-event/created"
  );
  const realtimeStepUpdates = irisStub.args.filter(
    (arg: any) => arg[0].type === "approval-step/updated"
  );
  const realtimeCollectionStatus = irisStub.args.filter(
    (arg: any) => arg[0].type === "collection/status-updated"
  );
  t.deepEquals(
    realtimeDesignEvents.map((message: any) => message[0].resource.type),
    ["COMMIT_QUOTE", "COMMIT_QUOTE"],
    "Realtime message emitted for design checkout"
  );
  // (4 steps receiving due dates * 2 designs) + 2 CHECKOUT STEPS being COMPLETED
  t.equals(
    realtimeStepUpdates.length,
    10,
    "Realtime message emitted for approval step status"
  );
  t.equals(
    realtimeCollectionStatus.length,
    1,
    "Realtime message emitted for approval step status"
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
    slackStub.args,
    [
      [
        {
          channel: "designers",
          templateName: "designer_payment",
          params: {
            collection,
            designer: user,
            paymentAmountCents: body.totalCents - CREDIT_AMOUNT_CENTS,
          },
        },
      ],
    ],
    "Slack message sent with correct values"
  );
});

test("/quote-payments POST does not generate quotes, payment method, invoice, lineItems on payment failure", async (t: Test) => {
  const { user, session } = await createUser();

  const { chargeStub } = setupStubs();
  chargeStub.rejects(new StripeError({ message: "Could not process payment" }));

  const paymentMethodTokenId = uuid.v4();

  const { team } = await generateTeam(user.id);
  const { collection } = await generateCollection({ teamId: team.id });
  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: design.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
  });

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
  t.assert(chargeStub.calledOnce, "Stripe was called");
});

test("POST /quote-payments?isWaived=true waives payment", async (t: Test) => {
  const { user, session } = await createUser();
  const { slackStub } = setupStubs();

  const { team } = await generateTeam(user.id);
  const { collection } = await generateCollection({ teamId: team.id });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();

  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: design.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });

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

  const [postResponse, body] = await post("/quote-payments?isWaived=true", {
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
    slackStub.args,
    [
      [
        {
          channel: "designers",
          templateName: "designer_payment",
          params: {
            collection,
            designer: user,
            paymentAmountCents: 0,
          },
        },
      ],
    ],
    "Slack message sent with correct values"
  );
});

test("POST /quote-payments?isWaived=true fails if ineligible", async (t: Test) => {
  const { user, session } = await createUser();
  setupStubs();

  const { team } = await generateTeam(user.id);
  const { collection } = await generateCollection({ teamId: team.id });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });

  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();

  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: design.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
  });

  const [postResponse, body] = await post("/quote-payments?isWaived=true", {
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
  t.equals(body.message, "Cannot waive payment for amounts greater than $0");
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

  const [postResponse] = await post("/quote-payments", {
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

  const [postResponse] = await post("/quote-payments", {
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
    "Design has already been paid for",
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
    "Design has already been paid for",
    "Error message interprets the error type"
  );
});
