import * as tape from 'tape';
import * as sinon from 'sinon';
import Cloudinary = require('cloudinary');

import * as CloudinaryService from './index';
import { sandbox, test } from '../../test-helpers/fresh';
import { CLOUDINARY_CLOUD_NAME } from '../../config';

test('Cloudinary Service supports generating a policy', async (t: tape.Test) => {
  const cloudinaryStub = sandbox().stub(Cloudinary.utils, 'sign_request').returns({
    foo: 'bar'
  });

  const policy = CloudinaryService.generateSignedUploadPolicy({ public_id: 'foo-123' });
  sinon.assert.callCount(cloudinaryStub, 1);
  t.deepEqual(policy, {
    parameters: { foo: 'bar' },
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`
  });
});
