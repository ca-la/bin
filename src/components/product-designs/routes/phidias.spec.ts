import * as tape from 'tape';

import { sandbox, test } from '../../../test-helpers/fresh';
import { authHeader, put } from '../../../test-helpers/http';
import * as NodesDAO from '../../nodes/dao';
import * as AssetsDAO from '../../assets/dao';
import createUser = require('../../../test-helpers/create-user');
import createDesign from '../../../services/create-design';

test('updateAllNodes updates all nodes', async (t: tape.Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { session: session2 } = await createUser({ role: 'USER' });
  const { session: session3 } = await createUser({ role: 'ADMIN' });
  const nodeStub = sandbox()
    .stub(NodesDAO, 'updateOrCreate')
    .resolves({ id: 'new-node' });
  const AssetStub = sandbox()
    .stub(AssetsDAO, 'updateOrCreate')
    .resolves({ id: 'new-asset' });

  const design = await createDesign({
    productType: '',
    title: 'test',
    userId: user.id
  });

  const body = {
    assets: [
      {
        createdAt: new Date(),
        deletedAt: null,
        description: null,
        id: '1234',
        mimeType: 'image/jpeg',
        originalHeightPx: 0,
        originalWidthPx: 0,
        title: null,
        uploadCompletedAt: null,
        userId: user.id
      }
    ],
    attributes: {
      artworks: [],
      dimensions: [],
      materials: [],
      sketches: []
    },
    nodes: [
      {
        id: '123451234',
        createdAt: new Date('2019-04-20'),
        createdBy: user.id,
        deletedAt: null,
        parentId: null,
        x: 0,
        y: 0,
        ordering: 0,
        title: null
      }
    ]
  };

  const [response, responseBody] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(session.id)
  });
  t.deepEqual(
    responseBody,
    {
      assets: [{ id: 'new-asset' }],
      attributes: {
        artworks: [],
        dimensions: [],
        materials: [],
        sketches: []
      },
      nodes: [{ id: 'new-node' }]
    },
    'body matches expected shape'
  );
  t.equal(response.status, 200, 'Response is 200');
  t.equal(nodeStub.calledOnce, true, 'Nodes DAO is called');
  t.equal(AssetStub.calledOnce, true, 'Asset DAO is called');

  const [response2] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(session2.id)
  });
  t.equal(response2.status, 403, 'Response is 403');
  t.equal(nodeStub.calledOnce, true, 'Nodes DAO is not called');
  t.equal(AssetStub.calledOnce, true, 'Asset DAO is not called');

  const [response3] = await put(`/product-designs/${design.id}`, {
    body,
    headers: authHeader(session3.id)
  });
  t.equal(response3.status, 200, 'Response is 200');
  t.equal(nodeStub.calledTwice, true, 'Nodes DAO is called again');
  t.equal(AssetStub.calledTwice, true, 'Asset DAO is called again');
});
