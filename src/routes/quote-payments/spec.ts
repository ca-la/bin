import * as uuid from 'node-uuid';

import * as CollectionsDAO from '../../components/collections/dao';
import * as CreditsDAO from '../../components/credits/dao';
import * as InvoicesDAO from '../../dao/invoices';
import * as LineItemsDAO from '../../dao/line-items';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import * as ProductDesignsDAO from '../../dao/product-designs';
import createUser = require('../../test-helpers/create-user');
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { authHeader, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import SlackService = require('../../services/slack');
import EmailService = require('../../services/email');
import Stripe = require('../../services/stripe');

test('/quote-payments POST generates quotes, payment method, invoice, lineItems, and charges', async (t: Test) => {
  const { user, session } = await createUser();
  const stripe = sandbox()
    .stub(Stripe, 'charge')
    .resolves({ id: 'chargeId' });
  sandbox()
    .stub(Stripe, 'findOrCreateCustomerId')
    .resolves('customerId');
  sandbox()
    .stub(Stripe, 'attachSource')
    .returns(Promise.resolve({ id: 'sourceId', last4: '1234' }));
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [postResponse, body] = await post('/quote-payments', {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300
        }
      ],
      paymentMethodTokenId
    },
    headers: authHeader(session.id)
  });

  t.equal(
    postResponse.status,
    201,
    'successfully pays the invoice created by quotes'
  );

  t.equals(body.isPaid, true, 'Invoice is paid');
  t.equals(
    body.collectionId,
    collection.id,
    'Invoice has correct collection Id set'
  );
  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 1, 'Line Item exists for design');
  t.equals(lineItems[0].designId, design.id, 'Line Item has correct design');
  t.assert(stripe.calledOnce, 'Stripe was charged');
});

test('/quote-payments POST does not generate quotes, payment method, invoice, lineItems on failure', async (t: Test) => {
  const { user, session } = await createUser();
  const stripe = sandbox()
    .stub(Stripe, 'charge')
    .rejects('Could not process payment');
  sandbox()
    .stub(Stripe, 'findOrCreateCustomerId')
    .resolves('customerId');
  sandbox()
    .stub(Stripe, 'attachSource')
    .returns(Promise.resolve({ id: 'sourceId', last4: '1234' }));
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();
  const paymentMethodTokenId = uuid.v4();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [postResponse] = await post('/quote-payments', {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300
        }
      ],
      paymentMethodTokenId
    },
    headers: authHeader(session.id)
  });

  t.equal(postResponse.status, 400, 'response errors');

  const invoice = await InvoicesDAO.findByUser(user.id);
  t.deepEquals(invoice, [], 'No invoice exists for design');
  t.assert(stripe.calledOnce, 'Stripe was called');
});

test('/quote-payments?isFinanced=true POST generates quotes, invoice, lineItems', async (t: Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [postResponse, body] = await post('/quote-payments?isFinanced=true', {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300
        }
      ]
    },
    headers: authHeader(session.id)
  });

  t.equal(postResponse.status, 201, 'successfully creates the invoice');

  t.equals(body.isPaid, false, 'Invoice is not paid');
  t.equals(
    body.collectionId,
    collection.id,
    'Invoice has correct collection Id set'
  );
  const lineItems = await LineItemsDAO.findByInvoiceId(body.id);
  t.equals(lineItems.length, 1, 'Line Item exists for design');
  t.equals(lineItems[0].designId, design.id, 'Line Item has correct design');
});

test('POST /quote-payments?isWaived=true waives payment', async (t: Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  const slackStub = sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });

  await CollectionsDAO.addDesign(collection.id, design.id);

  await generatePricingValues();

  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  await CreditsDAO.addCredit({
    amountCents: 10000000,
    createdBy: user.id,
    description: 'Free money',
    expiresAt: null,
    givenTo: user.id
  });

  const [postResponse, body] = await post('/quote-payments?isWaived=true', {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300
        }
      ]
    },
    headers: authHeader(session.id)
  });

  t.equal(postResponse.status, 201, 'successfully creates the invoice');
  t.equals(body.isPaid, true, 'Invoice is paid');
  t.equal(slackStub.callCount, 1);
});

test('POST /quote-payments?isWaived=true fails if ineligible', async (t: Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });

  await CollectionsDAO.addDesign(collection.id, design.id);

  await generatePricingValues();

  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [postResponse, body] = await post('/quote-payments?isWaived=true', {
    body: {
      collectionId: collection.id,
      createQuotes: [
        {
          designId: design.id,
          units: 300
        }
      ]
    },
    headers: authHeader(session.id)
  });

  t.equal(postResponse.status, 400, 'fails to pay the invoice');
  t.equals(body.message, 'Cannot waive payment for amounts greater than $0');
});

test(
  '/quote-payments?isFinanced=true POST does not generate quotes,' +
    ' invoice, lineItems on failure',
  async (t: Test) => {
    const { user, session } = await createUser();
    sandbox()
      .stub(EmailService, 'enqueueSend')
      .resolves();
    sandbox()
      .stub(SlackService, 'enqueueSend')
      .resolves();
    sandbox()
      .stub(LineItemsDAO, 'create')
      .rejects();
    const paymentMethodTokenId = uuid.v4();

    const collection = await CollectionsDAO.create({
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: 'Initial commit',
      id: uuid.v4(),
      title: 'Drop 001/The Early Years'
    });
    const design = await ProductDesignsDAO.create({
      productType: 'A product type',
      title: 'A design',
      userId: user.id
    });
    await CollectionsDAO.addDesign(collection.id, design.id);

    await generatePricingValues();
    await PricingCostInputsDAO.create({
      createdAt: new Date(),
      deletedAt: null,
      designId: design.id,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: 'BASIC',
      processes: [
        {
          complexity: '1_COLOR',
          name: 'SCREEN_PRINTING'
        },
        {
          complexity: '1_COLOR',
          name: 'SCREEN_PRINTING'
        }
      ],
      productComplexity: 'SIMPLE',
      productType: 'TEESHIRT'
    });

    const [postResponse] = await post('/quote-payments', {
      body: {
        collectionId: collection.id,
        createQuotes: [
          {
            designId: design.id,
            units: 300
          }
        ],
        paymentMethodTokenId
      },
      headers: authHeader(session.id)
    });

    t.equal(postResponse.status, 400, 'response errors');

    const invoice = await InvoicesDAO.findByUser(user.id);
    t.deepEquals(invoice, [], 'No invoice exists for design');
  }
);
