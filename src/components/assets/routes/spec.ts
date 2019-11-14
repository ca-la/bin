import tape from 'tape';
import uuid from 'node-uuid';

import createUser = require('../../../test-helpers/create-user');
import { authHeader, get, patch, put } from '../../../test-helpers/http';
import { sandbox, test } from '../../../test-helpers/fresh';
import * as AWSService from '../../../services/aws';
import * as AssetsDAO from '../dao';
import { USER_UPLOADS_BASE_URL } from '../../../config';
import generateAsset from '../../../test-helpers/factories/asset';

test('GET /product-design-images/:assetId returns an asset', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const assetId = uuid.v4();
  const { asset } = await generateAsset({ id: assetId, userId: user.id });

  const findStub = sandbox()
    .stub(AssetsDAO, 'findById')
    .resolves(asset);

  const [response, body] = await get(`/product-design-images/${assetId}`, {
    headers: authHeader(session.id)
  });

  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt),
      uploadCompletedAt: new Date(body.uploadCompletedAt)
    },
    asset,
    'Returns the found asset'
  );
  t.equal(response.status, 200, 'Returns with a success status');
  t.equal(findStub.callCount, 1, 'Find stub is called only once.');
});

test('PUT /product-design-images/:assetId creates an asset', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const assetId = uuid.v4();
  const { asset } = await generateAsset({ id: assetId, userId: user.id });

  const createStub = sandbox()
    .stub(AssetsDAO, 'create')
    .resolves(asset);

  const [response, body] = await put(`/product-design-images/${assetId}`, {
    headers: authHeader(session.id),
    body: {
      createdAt: new Date('2019-04-20'),
      description: null,
      id: assetId,
      mimeType: 'text/csv',
      originalHeightPx: 0,
      originalWidthPx: 0,
      title: 'my hawt jawnz list',
      uploadCompletedAt: null,
      userId: user.id
    }
  });
  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt),
      uploadCompletedAt: new Date(body.uploadCompletedAt)
    },
    asset,
    'Returns the created file'
  );
  t.equal(response.status, 201, 'Returns with a success status');
  t.equal(createStub.callCount, 1, 'Create stub is called only once.');
});

test('PATCH /product-design-images/:assetId updates an asset', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const assetId = uuid.v4();
  const { asset } = await generateAsset({ id: assetId, userId: user.id });

  const updateStub = sandbox()
    .stub(AssetsDAO, 'update')
    .resolves(asset);

  const updateBody = {
    uploadCompletedAt: new Date()
  };
  const [response, body] = await patch(`/product-design-images/${assetId}`, {
    headers: authHeader(session.id),
    body: updateBody
  });

  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt),
      uploadCompletedAt: new Date(body.uploadCompletedAt)
    },
    asset,
    'Returns the created asset'
  );
  t.equal(response.status, 200, 'Returns with a success status');
  t.equal(updateStub.callCount, 1, 'Update stub is called only once.');
  t.deepEqual(updateStub.args[0][0], assetId);
  t.deepEqual(
    {
      ...updateStub.args[0][1],
      uploadCompletedAt: new Date(updateStub.args[0][1].uploadCompletedAt)
    },
    updateBody
  );
});

test('GET /product-design-images/:assetId/upload-policy returns an upload policy', async (t: tape.Test) => {
  const { session } = await createUser();
  const assetId = uuid.v4();

  sandbox()
    .stub(AWSService, 'getUploadPolicy')
    .returns({
      fields: {
        'x-aws-foo': 'bar'
      },
      url: 'stub aws url'
    });

  const [response, body] = await get(
    `/product-design-images/${assetId}/upload-policy?mimeType=image%2fpng`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    contentDisposition: `attachment; filename="${assetId}.png"`,
    contentType: 'image/png',
    downloadUrl: `${USER_UPLOADS_BASE_URL}/${assetId}`,
    formData: {
      'x-aws-foo': 'bar'
    },
    remoteFileName: assetId,
    uploadUrl: 'stub aws url'
  });
});
