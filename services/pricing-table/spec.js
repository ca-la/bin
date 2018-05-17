'use strict';

const createDesign = require('../../dao/product-designs').create;
const replaceVariants = require('../../dao/product-design-variants').replaceForDesign;
const createUser = require('../../test-helpers/create-user');
const PricingCalculator = require('./index');
const { test } = require('../../test-helpers/fresh');

test('PricingCalculator constructs pricing tables', async (t) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id,
    retailPriceCents: 12345
  });

  await replaceVariants(design.id, [
    {
      unitsToProduce: 123,
      sizeName: 'M',
      colorName: 'Green',
      position: 0
    }
  ]);

  const calculator = new PricingCalculator(design);

  const { finalPricingTable } = await calculator.getAllPricingTables();

  // TODO: Build this out! Just a basic health check right now!
  t.equal(finalPricingTable.summary.upfrontCostCents, 0);
  t.equal(finalPricingTable.summary.preProductionCostCents, 0);
  t.equal(finalPricingTable.summary.uponCompletionCostCents, 0);

  t.equal(finalPricingTable.profit.totalProfitCents, 1518435);
  t.equal(finalPricingTable.profit.unitProfitCents, 12345);
});

test('PricingCalculator supports overriding pricing tables, and returns class instances', async (t) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id,
    retailPriceCents: 12345,
    overridePricingTable: {
      groups: [],
      profit: {
        title: 'Gross Profit per garment',
        unitProfitCents: 11585,
        marginPercentage: 64,
        totalProfitCents: 5
      },
      summary: {
        upfrontCostCents: 123456,
        fulfillmentCostCents: 0,
        preProductionCostCents: 120339,
        uponCompletionCostCents: 1
      }
    }
  });

  await replaceVariants(design.id, [
    {
      unitsToProduce: 123,
      sizeName: 'M',
      colorName: 'Green',
      position: 0
    }
  ]);

  const calculator = new PricingCalculator(design);

  const { finalPricingTable } = await calculator.getAllPricingTables();

  t.equal(finalPricingTable.summary.upfrontCostCents, 123456);
  t.equal(finalPricingTable.serializeWithoutBreakdown().summary.upfrontCostCents, 123456);
});
