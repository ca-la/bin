import * as tape from 'tape';
import { omit } from 'lodash';

import { test } from '../../test-helpers/fresh';
import * as PricingQuotesDAO from './index';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import {
  Complexity,
  MaterialCategory,
  ProductType
} from '../../domain-objects/pricing';

test('PricingQuotes DAO with no data', async (t: tape.Test) => {
  try {
    await PricingQuotesDAO.findLatestValuesForRequest({
      designId: null,
      materialCategory: 'SPECIFY',
      processes: [],
      productComplexity: 'COMPLEX',
      productType: 'BLAZER',
      units: 1000
    });
    t.fail('Should not have succeeded');
  } catch {
    t.ok('Finding latest values fails');
  }
});

test('PricingQuotes DAO supports finding the latest values', async (t: tape.Test) => {
  // generate a bunch of values in the test db.
  await generatePricingValues();

  // product type failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest({
      designId: null,
      materialCategory: 'BASIC',
      processes: [],
      productComplexity: 'SIMPLE',
      productType: 'LONG_JOHNS' as ProductType,
      units: 1000
    });
  } catch (error) {
    t.equal(error.message, 'Pricing product type could not be found!');
  }

  // complexity failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest({
      designId: null,
      materialCategory: 'BASIC',
      processes: [],
      productComplexity: 'SIMPLE FOO' as Complexity,
      productType: 'TEESHIRT',
      units: 1000
    });
  } catch (error) {
    t.equal(error.message, 'Pricing product type could not be found!');
  }

  // material failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest({
      designId: null,
      materialCategory: 'BASIC FOO' as MaterialCategory,
      processes: [],
      productComplexity: 'SIMPLE',
      productType: 'TEESHIRT',
      units: 1000
    });
  } catch (error) {
    t.equal(error.message, 'Pricing product material could not be found!');
  }

  // success

  const latestValueRequest = await PricingQuotesDAO.findLatestValuesForRequest({
    designId: null,
    materialCategory: 'BASIC',
    processes: [],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT',
    units: 1000
  });

  t.deepEqual(
    omit(
      {
        ...latestValueRequest,
        careLabel: {
          ...omit(latestValueRequest.careLabel, 'createdAt', 'id')
        },
        margin: {
          ...omit(latestValueRequest.margin, 'createdAt', 'id')
        },
        material: {
          ...omit(latestValueRequest.material, 'createdAt', 'id')
        },
        sample: {
          ...omit(latestValueRequest.sample, 'createdAt', 'id')
        },
        type: {
          ...omit(latestValueRequest.type, 'createdAt', 'id')
        }
      },
      'constantId'
    ),
    {
      brandedLabelsAdditionalCents: 5,
      brandedLabelsMinimumCents: 25500,
      brandedLabelsMinimumUnits: 1000,
      careLabel: {
        minimumUnits: 1000,
        unitCents: 12,
        version: 0
      },
      gradingCents: 5000,
      margin: {
        margin: '8',
        minimumUnits: 1000,
        version: 0
      },
      markingCents: 5000,
      material: {
        category: 'BASIC',
        minimumUnits: 500,
        unitCents: 400,
        version: 0
      },
      patternRevisionCents: 5000,
      processTimeline: null,
      processes: [],
      sample: {
        complexity: 'SIMPLE',
        contrast: '0.15',
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 1,
        name: 'TEESHIRT',
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 21600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 15000,
        version: 0,
        yield: '1.5'
      },
      sampleMinimumCents: 7500,
      technicalDesignCents: 5000,
      type: {
        complexity: 'SIMPLE',
        contrast: '0.15',
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 750,
        name: 'TEESHIRT',
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 270000000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 750,
        version: 0,
        yield: '1.5'
      },
      workingSessionCents: 2500
    },
    'Returns the latest values for a request'
  );

  // success with processes

  const latestValueRequestWithProcesses = await PricingQuotesDAO.findLatestValuesForRequest(
    {
      designId: null,
      materialCategory: 'BASIC',
      processes: [
        {
          complexity: '2_COLORS',
          name: 'SCREEN_PRINTING'
        }
      ],
      productComplexity: 'SIMPLE',
      productType: 'TEESHIRT',
      units: 1000
    }
  );

  t.deepEqual(
    omit(
      {
        ...latestValueRequestWithProcesses,
        careLabel: {
          ...omit(latestValueRequestWithProcesses.careLabel, 'createdAt', 'id')
        },
        margin: {
          ...omit(latestValueRequestWithProcesses.margin, 'createdAt', 'id')
        },
        material: {
          ...omit(latestValueRequestWithProcesses.material, 'createdAt', 'id')
        },
        processTimeline: {
          ...omit(
            latestValueRequestWithProcesses.processTimeline,
            'createdAt',
            'id'
          )
        },
        processes: [
          {
            ...omit(
              latestValueRequestWithProcesses.processes[0],
              'createdAt',
              'id'
            )
          }
        ],
        sample: {
          ...omit(latestValueRequestWithProcesses.sample, 'createdAt', 'id')
        },
        type: {
          ...omit(latestValueRequestWithProcesses.type, 'createdAt', 'id')
        }
      },
      'constantId'
    ),
    {
      brandedLabelsAdditionalCents: 5,
      brandedLabelsMinimumCents: 25500,
      brandedLabelsMinimumUnits: 1000,
      careLabel: {
        minimumUnits: 1000,
        unitCents: 12,
        version: 0
      },
      gradingCents: 5000,
      margin: {
        margin: '8',
        minimumUnits: 1000,
        version: 0
      },
      markingCents: 5000,
      material: {
        category: 'BASIC',
        minimumUnits: 500,
        unitCents: 400,
        version: 0
      },
      patternRevisionCents: 5000,
      processTimeline: {
        minimumUnits: 50,
        timeMs: 86400000,
        uniqueProcesses: 1,
        version: 0
      },
      processes: [
        {
          complexity: '2_COLORS',
          minimumUnits: 1000,
          name: 'SCREEN_PRINTING',
          setupCents: 6000,
          unitCents: 105,
          version: 0
        }
      ],
      sample: {
        complexity: 'SIMPLE',
        contrast: '0.15',
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 1,
        name: 'TEESHIRT',
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 21600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 15000,
        version: 0,
        yield: '1.5'
      },
      sampleMinimumCents: 7500,
      technicalDesignCents: 5000,
      type: {
        complexity: 'SIMPLE',
        contrast: '0.15',
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 750,
        name: 'TEESHIRT',
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 270000000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 750,
        version: 0,
        yield: '1.5'
      },
      workingSessionCents: 2500
    },
    'Returns the latest values for a request'
  );
});
