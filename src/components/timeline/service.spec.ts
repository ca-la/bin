import tape from 'tape';
import uuid from 'node-uuid';
import { TaskStatus } from '@cala/ts-lib';

import * as Service from './service';
import { authHeader, post } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import * as PricingCostInputsDAO from '../pricing-cost-inputs/dao';
import { create as createDesign } from '../product-designs/dao';
import generateCollection from '../../test-helpers/factories/collection';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';
import generateTask from '../../test-helpers/factories/task';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';
import generateAsset from '../../test-helpers/factories/asset';
import { PricingQuote } from '../../domain-objects/pricing-quote';
import { moveDesign } from '../../test-helpers/collections';

test('findByUserId finds timelines by user id with task breakdowns', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await generateCollaborator({ userId: user.id, designId: design.id });
  const { stage } = await generateProductDesignStage({ designId: design.id });
  await generateTask({ designStageId: stage.id, status: TaskStatus.COMPLETED });
  await generateTask({ designStageId: stage.id });
  await generateTask({ designStageId: stage.id });
  await generateProductDesignStage({
    designId: design.id,
    title: 'Unsupported'
  });

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    expiresAt: null,
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
  await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });
  const timeline = await Service.findAllByUserId(user.id);
  t.deepEqual(
    timeline,
    [
      {
        bufferTimeMs: 190588235,
        collections: [],
        creationTimeMs: 0,
        design: {
          id: design.id,
          title: design.title,
          imageLinks: []
        },
        designId: design.id,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        stages: [
          {
            id: timeline[0].stages[0].id,
            completedAt: null,
            completedTasks: 1,
            ordering: 0,
            startedAt: timeline[0].stages[0].startedAt,
            time: 0,
            title: 'Creation',
            totalTasks: 3
          }
        ],
        startDate: timeline[0].startDate
      }
    ],
    'returns expected timeline values without unsupported stage'
  );
});

test('findByCollectionId finds timelines by collection id and completed stage', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { collection } = await generateCollection({ createdBy: user.id });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await moveDesign(collection.id, design.id);

  const { asset: sketch } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
    uploadCompletedAt: new Date(),
    userId: user.id
  });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: sketch.id
  });
  await generateCanvas({
    designId: design.id,
    componentId: component.id,
    createdBy: user.id
  });

  const { stage } = await generateProductDesignStage({ designId: design.id });
  await generateTask({ designStageId: stage.id, status: TaskStatus.COMPLETED });
  await generateTask({ designStageId: stage.id, status: TaskStatus.COMPLETED });
  await generateTask({ designStageId: stage.id, status: TaskStatus.COMPLETED });

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    expiresAt: null,
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
  await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });
  const timeline = await Service.findAllByCollectionId(collection.id);
  t.deepEqual(
    timeline,
    [
      {
        bufferTimeMs: 190588235,
        collections: [{ id: collection.id, title: collection.title }],
        creationTimeMs: 0,
        design: {
          id: design.id,
          title: design.title,
          imageLinks: timeline[0].design.imageLinks
        },
        designId: design.id,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        stages: [
          {
            id: timeline[0].stages[0].id,
            completedAt: timeline[0].stages[0].completedAt,
            completedTasks: 3,
            ordering: 0,
            startedAt: timeline[0].stages[0].startedAt,
            time: 0,
            title: 'Creation',
            totalTasks: 3
          }
        ],
        startDate: timeline[0].startDate
      }
    ],
    'returns expected timeline values'
  );
  t.equal(
    timeline[0].design.imageLinks[0].previewLink.includes(sketch.id),
    true,
    'image preview links contain sketch id'
  );
  t.equal(
    timeline[0].design.imageLinks[0].thumbnailLink.includes(sketch.id),
    true,
    'image thumbnail links contain sketch id'
  );
});

test('format timelines only returns valid timelines', async (t: tape.Test) => {
  const { user } = await createUser();
  const validDesign = await createDesign({
    productType: 'A product type',
    title: 'A newer design',
    userId: user.id
  });

  const invalidDesign = await createDesign({
    productType: 'A product type',
    title: 'An older design',
    userId: user.id
  });

  const baseQuote: PricingQuote = {
    id: uuid.v4(),
    processes: [],
    createdAt: new Date(),
    pricingQuoteInputId: '',
    productType: 'BLAZER',
    productComplexity: 'COMPLEX',
    materialCategory: 'BASIC',
    materialBudgetCents: 0,
    units: 0,
    baseCostCents: 0,
    materialCostCents: 0,
    processCostCents: 0,
    unitCostCents: 0,
    designId: '',
    creationTimeMs: 0,
    specificationTimeMs: 0,
    sourcingTimeMs: 0,
    samplingTimeMs: 0,
    preProductionTimeMs: 0,
    productionTimeMs: 0,
    fulfillmentTimeMs: 0,
    processTimeMs: 0
  };

  const validQuote = {
    ...baseQuote,
    designId: validDesign.id
  };

  const invalidQuote = {
    ...baseQuote,
    designId: invalidDesign.id,
    creationTimeMs: null,
    specificationTimeMs: null,
    sourcingTimeMs: null,
    samplingTimeMs: null,
    preProductionTimeMs: null,
    productionTimeMs: null,
    fulfillmentTimeMs: null,
    processTimeMs: null
  };

  const timelines = await Service.formatTimelines(
    [validQuote, invalidQuote],
    [validDesign, invalidDesign]
  );

  t.equal(timelines.length, 1, 'returns only valid timelines');
});
