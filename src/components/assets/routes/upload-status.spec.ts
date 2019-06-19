import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { test } from '../../../test-helpers/fresh';
import * as API from '../../../test-helpers/http';
import createUser = require('../../../test-helpers/create-user');
import generateAsset from '../../../test-helpers/factories/asset';

const API_PATH = '/product-design-images';

test(`PUT ${API_PATH}/upload-status returns an updated image`, async (t: tape.Test) => {
  const userOne = await createUser();

  const { asset: sketch } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    uploadCompletedAt: null,
    userId: userOne.user.id
  });
  const uploadCompletedAt = new Date().toISOString();

  const [response, body] = await API.put(
    `${API_PATH}/${sketch.id}/upload-status`,
    {
      body: { uploadCompletedAt },
      headers: API.authHeader(userOne.session.id)
    }
  );
  t.equal(response.status, 200);
  t.deepEqual(
    { id: body.id, uploadCompletedAt: body.uploadCompletedAt },
    { id: sketch.id, uploadCompletedAt },
    'Returns the updated image'
  );
});
