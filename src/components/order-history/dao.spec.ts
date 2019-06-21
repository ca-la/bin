import { test, Test } from '../../test-helpers/fresh';

import { getOrderHistoryByUserId } from './dao';
import createUser = require('../../test-helpers/create-user');
import createDesign from '../../services/create-design';
import generateAsset from '../../test-helpers/factories/asset';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';
import generateCollection from '../../test-helpers/factories/collection';
import generateInvoice from '../../test-helpers/factories/invoice';
import { moveDesign } from '../../dao/collections';
import generateInvoicePayment from '../../test-helpers/factories/invoice-payment';
import generateLineItem from '../../test-helpers/factories/line-item';
import {
  PricingQuote,
  PricingQuoteRequestWithVersions
} from '../../domain-objects/pricing-quote';
import generatePricingQuote from '../../services/generate-pricing-quote';
import generatePricingValues from '../../test-helpers/factories/pricing-values';

async function createQuote(
  createPricingValues: boolean = true
): Promise<PricingQuote> {
  if (createPricingValues) {
    await generatePricingValues();
  }

  const quoteRequestOne: PricingQuoteRequestWithVersions = {
    designId: null,
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
    productType: 'TEESHIRT',
    units: 100000,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0
  };

  return generatePricingQuote(quoteRequestOne);
}

test('getOrderHistoryByUserId returns a list of all purchases', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const result1 = await getOrderHistoryByUserId({ userId: user.id });
  t.deepEqual(result1, [], 'Returns nothing if no purchases have been made');

  // Create all the items necessary to go through with a "payment"

  const design1 = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  const { collection } = await generateCollection({
    createdBy: user.id,
    title: 'Collection1'
  });
  await moveDesign(collection.id, design1.id);

  const { asset } = await generateAsset({ userId: user.id });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: asset.id
  });
  await generateCanvas({
    componentId: component.id,
    designId: design1.id,
    createdBy: user.id
  });

  const { invoice } = await generateInvoice({
    collectionId: collection.id,
    totalCents: 100000,
    userId: user.id
  });
  await generateInvoicePayment({
    invoiceId: invoice.id,
    stripeChargeId: 'stripe-foo-bar'
  });
  const quote = await createQuote(true);
  const { lineItem } = await generateLineItem(quote.id, {
    designId: design1.id,
    invoiceId: invoice.id
  });

  const result2 = await getOrderHistoryByUserId({ userId: user.id });

  t.equal(result2.length, 1);
  t.deepEqual(
    result2[0],
    {
      lineItemId: lineItem.id,
      invoiceId: invoice.id,
      designId: design1.id,
      designTitle: 'Plain White Tee',
      designCollections: [
        {
          id: collection.id,
          title: 'Collection1'
        }
      ],
      designImageIds: [asset.id],
      createdAt: invoice.createdAt,
      totalCostCents: invoice.totalCents,
      units: quote.units,
      baseUnitCostCents: quote.unitCostCents
    },
    'Returns the constructed object.'
  );
});
