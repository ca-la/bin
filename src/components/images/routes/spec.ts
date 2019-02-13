import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { test } from '../../../test-helpers/fresh';
import * as API from '../../../test-helpers/http';
import createUser = require('../../../test-helpers/create-user');
import { create as createImage } from '../dao';

const API_PATH = '/product-design-images';

test(
  `GET ${API_PATH}/upload_status returns an updated image`,
  async (t: tape.Test) => {
    const userOne = await createUser();

    const sketch = await createImage({
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

    const [response, body] = await API.put(`${API_PATH}/${sketch.id}/upload_status`, {
      body: { uploadCompletedAt },
      headers: API.authHeader(userOne.session.id)
    });
    t.equal(response.status, 200);
    t.deepEqual(
      { id: body.id, uploadCompletedAt: body.uploadCompletedAt },
      { id: sketch.id, uploadCompletedAt },
      'Returns the updated image'
    );
  }
);
