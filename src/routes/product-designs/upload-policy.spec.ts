import * as tape from 'tape';
import * as uuid from 'node-uuid';

import createUser = require('../../test-helpers/create-user');
import { authHeader, get } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as AWSService from '../../services/aws';
import { USER_UPLOADS_BASE_URL } from '../../config';

test('GET /product-designs/upload-policy/:id returns an upload policy', async (t: tape.Test) => {
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
    `/product-designs/upload-policy/${assetId}?mimeType=image/png`,
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
