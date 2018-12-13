import * as uuid from 'node-uuid';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as PricingQuotesDAO from '../../dao/pricing-quotes';
import { PricingQuoteValues } from '../../domain-objects/pricing-quote';
import { generateUnsavedQuote } from './index';

test('generateUnsavedQuote', async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 255,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 4000,
      unitCents: 5,
      version: 0
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 5,
      minimumUnits: 4500,
      version: 0
    },
    markingCents: 5000,
    material: {
      category: 'BASIC',
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 500,
      unitCents: 200,
      version: 0
    },
    patternRevisionCents: 5000,
    processes: [{
      complexity: '1_COLOR',
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 2000,
      name: 'SCREEN_PRINTING',
      setupCents: 3000,
      unitCents: 50,
      version: 0
    }, {
      complexity: '1_COLOR',
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 2000,
      name: 'SCREEN_PRINTING',
      setupCents: 3000,
      unitCents: 50,
      version: 0
    }],
    sample: {
      complexity: 'SIMPLE',
      contrast: 0.15,
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 1,
      name: 'TEESHIRT',
      patternMinimumCents: 10000,
      unitCents: 15000,
      version: 0,
      yield: 1.50
    },
    sampleMinimumCents: 7500,
    technicalDesignCents: 5000,
    type: {
      complexity: 'SIMPLE',
      contrast: 0.15,
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 1500,
      name: 'TEESHIRT',
      patternMinimumCents: 10000,
      unitCents: 375,
      version: 0,
      yield: 1.50
    },
    workingSessionCents: 2500
  };

  sandbox().stub(PricingQuotesDAO, 'findLatestValuesForRequest')
    .resolves(latestValues);

  const unsavedQuote = await generateUnsavedQuote({
    designId: null,
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT',
    units: 100000
  });

  t.equal(unsavedQuote.baseCostCents, 385, 'calculates base cost correctly');
  t.equal(unsavedQuote.processCostCents, 101, 'calculates process cost correctly');
  t.equal(unsavedQuote.unitCostCents, 1776, 'calculates total unit cost correctly');
});

test('generateUnsavedQuote for blank', async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 25500,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      unitCents: 5,
      version: 0
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 12.6,
      minimumUnits: 100,
      version: 0
    },
    markingCents: 5000,
    material: {
      category: 'SPECIFY',
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 0,
      unitCents: 0,
      version: 0
    },
    patternRevisionCents: 5000,
    processes: [{
      complexity: '1_COLOR',
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      name: 'SCREEN_PRINTING',
      setupCents: 6000,
      unitCents: 110,
      version: 0
    }],
    sample: {
      complexity: 'BLANK',
      contrast: 0,
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 1,
      name: 'TEESHIRT',
      patternMinimumCents: 0,
      unitCents: 0,
      version: 0,
      yield: 1
    },
    sampleMinimumCents: 0,
    technicalDesignCents: 5000,
    type: {
      complexity: 'BLANK',
      contrast: 0,
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      name: 'SHORTS',
      patternMinimumCents: 0,
      unitCents: 0,
      version: 0,
      yield: 1
    },
    workingSessionCents: 2500
  };

  sandbox().stub(PricingQuotesDAO, 'findLatestValuesForRequest')
    .resolves(latestValues);

  const unsavedQuote = await generateUnsavedQuote({
    designId: null,
    materialBudgetCents: 1100,
    materialCategory: 'BASIC',
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'BLANK',
    productType: 'TEESHIRT',
    units: 100
  });

  t.equal(unsavedQuote.baseCostCents, 260, 'calculates base cost correctly');
  t.equal(unsavedQuote.processCostCents, 170, 'calculates process cost correctly');
  t.equal(unsavedQuote.unitCostCents, 1751, 'calculates total unit cost correctly');
});
