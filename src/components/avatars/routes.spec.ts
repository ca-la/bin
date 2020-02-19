import { sandbox, test, Test } from '../../test-helpers/fresh';

import createUser = require('../../test-helpers/create-user');
import { authHeader, get } from '../../test-helpers/http';
import * as AWSService from '../../services/aws';
import { AVATAR_BASE_URL } from '../../config';

test('GET /avatars/upload-policy returns an upload policy', async (t: Test) => {
  const { session, user } = await createUser();

  sandbox()
    .stub(AWSService, 'getUploadPolicy')
    .returns({
      fields: {
        'x-aws-foo': 'bar'
      },
      url: 'stub aws url'
    });

  const [response, body] = await get(
    `/avatars/upload-policy?mimeType=image/png`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    contentDisposition: `attachment; filename="${user.id}.png"`,
    contentType: 'image/png',
    downloadUrl: `${AVATAR_BASE_URL}/${user.id}`,
    formData: {
      'x-aws-foo': 'bar'
    },
    remoteFileName: user.id,
    uploadUrl: 'stub aws url'
  });
});

test('GET /avatars/upload-policy returns 400 for bad mime types', async (t: Test) => {
  const { session } = await createUser();

  sandbox()
    .stub(AWSService, 'getUploadPolicy')
    .returns({
      fields: {
        'x-aws-foo': 'bar'
      },
      url: 'stub aws url'
    });

  const [response, body] = await get(
    `/avatars/upload-policy?mimeType=application/exe`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 400);
  t.deepEqual(body.message, 'File format not supported');
});
