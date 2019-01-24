import * as tape from 'tape';
import * as uuid from 'node-uuid';

import createUser = require('../../test-helpers/create-user');
import { authHeader, get } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as AWSService from '../../services/aws';
import * as CloudinaryService from '../../services/cloudinary';
import { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME as BUCKET_NAME } from '../../config';

test('GET /product-designs/upload-policy/:id returns an upload policy', async (t: tape.Test) => {
  const { session } = await createUser();
  const assetId = uuid.v4();

  sandbox().stub(AWSService, 'getUploadPolicy').returns(Promise.resolve({
    fields: {
      'x-aws-foo': 'bar'
    },
    url: 'stub aws url'
  }));
  sandbox().stub(CloudinaryService, 'generateSignedUploadPolicy').returns({
    parameters: {
      api_key: 'xyz-789',
      folder: 'test',
      public_id: 'bar',
      signature: 'abc-123',
      timestamp: '0'
    },
    uploadUrl: 'https://foo.biz/cala-upload'
  });

  const [response, body] = await get(
    `/product-designs/upload-policy/${assetId}?mimeType=image/png`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    cloudinaryPolicy: {
      parameters: {
        api_key: 'xyz-789',
        folder: 'test',
        public_id: 'bar',
        signature: 'abc-123',
        timestamp: '0'
      },
      uploadUrl: 'https://foo.biz/cala-upload'
    },
    contentDisposition: `attachment; filename="${assetId}.png"`,
    contentType: 'image/png',
    downloadUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${assetId}`,
    formData: {
      'x-aws-foo': 'bar'
    },
    remoteFileName: assetId,
    uploadUrl: 'stub aws url'
  });
});