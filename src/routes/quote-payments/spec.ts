import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import StripeError = require("../../errors/stripe");
import InvalidDataError = require("../../errors/invalid-data");
import * as attachSource from "../../services/stripe/attach-source";
import * as CollectionsDAO from "../../components/collections/dao";
import * as CreditsDAO from "../../components/credits/dao";
import * as InvoicesDAO from "../../dao/invoices";
import { create as createAddress } from "../../dao/addresses";
import { findByAddressId } from "../../dao/invoice-addresses";
import * as LineItemsDAO from "../../dao/line-items";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";
import createUser from "../../test-helpers/create-user";
import EmailService = require("../../services/email");
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import SlackService = require("../../services/slack");
import Stripe = require("../../services/stripe");
import { authHeader, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { addDesign } from "../../test-helpers/collections";
import { createStorefront } from "../../services/create-storefront";
import { ProviderName } from "../../components/storefronts/tokens/domain-object";
import * as CreateShopifyProducts from "../../services/create-shopify-products";
import { ApprovalStepState } from "../../components/approval-steps/domain-object";
import createDesign from "../../services/create-design";
import * as IrisService from "../../components/iris/send-message";

const ADDRESS_BLANK = {
  companyName: "CALA",
  addressLine1: "42 Wallaby Way",
  addressLine2: "",
  city: "Sydney",
  region: "NSW",
  country: "AU",
  postCode: "RG41 2PE",
};

test("/quote-payments POST generates quotes, payment method, invoice, lineItems, and charges", async (t: Test) => {
  const { user, session } = await createUser();
  const stripe = sandbox().stub(Stripe, "charge").resolves({ id: "chargeId" });
  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const d1 = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "Another product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, d1.id);
  await addDesign(collection.id, d2.id);
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
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
  t.equals(invoiceAddress.addressId, address.id);

  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 2, "Line Item exists for designs");
  t.equals(lineItems[0].designId, d1.id, "Line Item has correct design");
  t.equals(lineItems[1].designId, d2.id, "Line Item has correct design");
  t.assert(stripe.calledOnce, "Stripe was charged");

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
});

test("/quote-payments POST does not generate quotes, payment method, invoice, lineItems on payment failure", async (t: Test) => {
  const { user, session } = await createUser();
  const stripe = sandbox()
    .stub(Stripe, "charge")
    .rejects(new StripeError({ message: "Could not process payment" }));
  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, design.id);
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
  t.assert(stripe.calledOnce, "Stripe was called");
});

test("POST /quote-payments?isWaived=true waives payment", async (t: Test) => {
  const { user, session } = await createUser();
  sandbox().stub(EmailService, "enqueueSend").resolves();
  const slackStub = sandbox().stub(SlackService, "enqueueSend").resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, design.id);
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

  await CreditsDAO.addCredit({
    amountCents: 10000000,
    createdBy: user.id,
    description: "Free money",
    expiresAt: null,
    givenTo: user.id,
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
  t.equals(invoiceAddress.addressId, address.id);

  t.equal(postResponse.status, 201, "successfully creates the invoice");
  t.equals(body.isPaid, true, "Invoice is paid");
  t.equal(slackStub.callCount, 1);
});

test("POST /quote-payments?isWaived=true fails if ineligible", async (t: Test) => {
  const { user, session } = await createUser();
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(SlackService, "enqueueSend").resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });

  await addDesign(collection.id, design.id);

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
    const { user, session } = await createUser();
    sandbox().stub(EmailService, "enqueueSend").resolves();
    sandbox().stub(SlackService, "enqueueSend").resolves();
    sandbox()
      .stub(attachSource, "default")
      .resolves({ id: "sourceId", last4: "1234" });
    sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
    sandbox()
      .stub(LineItemsDAO, "create")
      .rejects(new InvalidDataError("Duplicate"));
    const paymentMethodTokenId = uuid.v4();

    const collection = await CollectionsDAO.create({
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: "Initial commit",
      id: uuid.v4(),
      teamId: null,
      title: "Drop 001/The Early Years",
    });
    const design = await createDesign({
      productType: "A product type",
      title: "A design",
      userId: user.id,
    });
    await addDesign(collection.id, design.id);
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
  }
);

test("POST /quote-payments creates shopify products if connected to a storefront", async (t: Test) => {
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  sandbox().stub(Stripe, "charge").resolves({ id: "chargeId" });
  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  const createShopifyProductsStub = sandbox()
    .stub(CreateShopifyProducts, "createShopifyProductsForCollection")
    .resolves();

  const { user, session } = await createUser();
  await createStorefront({
    userId: user.id,
    accessToken: "token-foo",
    name: "The Gift Shop",
    baseUrl: "gift.shop",
    providerName: ProviderName.SHOPIFY,
  });
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, design.id);
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

  t.equal(postResponse.status, 201, "succesful payment");
  t.deepEqual(createShopifyProductsStub.firstCall.args, [
    user.id,
    collection.id,
  ]);
});

test("POST /quote-payments still succeeds if creates shopify products fails", async (t: Test) => {
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  sandbox().stub(Stripe, "charge").resolves({ id: "chargeId" });
  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });

  const createShopifyProductsStub = sandbox()
    .stub(CreateShopifyProducts, "createShopifyProductsForCollection")
    .rejects(new Error("Unexpected Error"));

  const { user, session } = await createUser();
  await createStorefront({
    userId: user.id,
    accessToken: "token-foo",
    name: "The Gift Shop",
    baseUrl: "gift.shop",
    providerName: ProviderName.SHOPIFY,
  });
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });
  await addDesign(collection.id, design.id);

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
      processes: [],
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

  t.equal(postResponse.status, 201, "succesful payment");
  t.equal(createShopifyProductsStub.callCount, 1);
});

test("POST /quote-payments does not allow parallel requests to succeed", async (t: Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(Stripe, "charge")
    .callsFake(async () => {
      return {
        chargeId: uuid.v4(),
      };
    });

  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  sandbox().stub(IrisService, "sendMessage").resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const d1 = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "Another product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, d1.id);
  await addDesign(collection.id, d2.id);
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
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
  t.equal(failed[0].message, `Design ${d1.id} has already been paid for`);
});

test("POST /quote-payments does not allow consecutive requests to succeed", async (t: Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(Stripe, "charge")
    .callsFake(async () => {
      return {
        chargeId: uuid.v4(),
      };
    });

  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");
  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });
  sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(SlackService, "enqueueSend").resolves();
  sandbox().stub(IrisService, "sendMessage").resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const d1 = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "Another product type",
    title: "A design",
    userId: user.id,
  });
  await addDesign(collection.id, d1.id);
  await addDesign(collection.id, d2.id);
  const address = await createAddress({
    ...ADDRESS_BLANK,
    userId: user.id,
  });

  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
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
  t.equal(b1.message, `Design ${d1.id} has already been paid for`);
});
