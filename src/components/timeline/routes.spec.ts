import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { authHeader, get, post } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import * as PricingCostInputsDAO from '../pricing-cost-inputs/dao';
import { create as createDesign } from '../product-designs/dao';
import generateCollection from '../../test-helpers/factories/collection';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import { moveDesign } from '../../test-helpers/collections';

test('GET /timelines?userId and /timelines?collectionId finds timelines by user id', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { collection } = await generateCollection({ createdBy: user.id });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await moveDesign(collection.id, design.id);
  await generateCollaborator({ userId: user.id, designId: design.id });

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
  const [response, body] = await get(`/timelines?userId=${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, '?userId returns a 200');
  t.deepEqual(
    body,
    [
      {
        bufferTimeMs: 190588235,
        collections: [{ id: collection.id, title: collection.title }],
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
        stages: [],
        startDate: body[0].startDate
      }
    ],
    '?userId returns expected timeline values'
  );

  const [response2, body2] = await get(
    `/timelines?collectionId=${collection.id}`,
    {
      headers: authHeader(session.id)
    }
  );
  t.equal(response2.status, 200, '?collectionId returns a 200');
  t.deepEqual(
    body2,
    [
      {
        bufferTimeMs: 190588235,
        collections: [{ id: collection.id, title: collection.title }],
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
        stages: [],
        startDate: body[0].startDate
      }
    ],
    '?collectionId returns expected timeline values'
  );
});
