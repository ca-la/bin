import * as tape from 'tape';
import * as uuid from 'node-uuid';

import * as Service from './service';
import { authHeader, post } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import * as CollectionsDAO from '../../dao/collections';
import { create as createDesign } from '../../dao/product-designs';
import generateCollection from '../../test-helpers/factories/collection';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import { create as createImage } from '../../components/images/dao';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';

test('findByUserId finds timelines by user id', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await generateCollaborator({ userId: user.id, designId: design.id });

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
        fulfillmentTimeMs: 259200000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 302400000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        startDate: timeline[0].startDate
      }
    ],
    'returns expected timeline values'
  );
});

test('findByCollectionId finds timelines by collection id', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { collection } = await generateCollection({ createdBy: user.id });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection.id, design.id);

  const sketch = await createImage({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
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
        fulfillmentTimeMs: 259200000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 302400000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
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
