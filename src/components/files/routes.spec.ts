import * as tape from 'tape';
import * as uuid from 'node-uuid';

import createUser = require('../../test-helpers/create-user');
import { authHeader, get, patch, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as AWSService from '../../services/aws';
import * as FilesDAO from './dao';
import { AWS_FILES_BUCKET_NAME as BUCKET_NAME } from '../../config';
import generateFile from '../../test-helpers/factories/file';

test('GET /files/:fileId returns a file', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const fileId = uuid.v4();
  const { file } = await generateFile({ createdBy: user.id, id: fileId });

  const findStub = sandbox()
    .stub(FilesDAO, 'findById')
    .resolves(file);

  const [response, body] = await get(`/files/${fileId}`, {
    headers: authHeader(session.id)
  });

  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt)
    },
    file,
    'Returns the found file'
  );
  t.equal(response.status, 200, 'Returns with a success status');
  t.equal(findStub.callCount, 1, 'Find stub is called only once.');
});

test('PUT /files/:fileId creates a file', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const fileId = uuid.v4();
  const { file } = await generateFile({ createdBy: user.id, id: fileId });

  const createStub = sandbox()
    .stub(FilesDAO, 'create')
    .resolves(file);

  const [response, body] = await put(`/files/${fileId}`, {
    headers: authHeader(session.id),
    body: {
      id: fileId,
      createdAt: new Date(),
      createdBy: user.id,
      mimeType: 'text/csv',
      name: null,
      uploadCompletedAt: null
    }
  });

  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt)
    },
    file,
    'Returns the created file'
  );
  t.equal(response.status, 201, 'Returns with a success status');
  t.equal(createStub.callCount, 1, 'Create stub is called only once.');
});

test('PATCH /files/:fileId updates a file', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const fileId = uuid.v4();
  const { file } = await generateFile({ createdBy: user.id, id: fileId });

  const updateStub = sandbox()
    .stub(FilesDAO, 'update')
    .resolves(file);

  const updateBody = {
    uploadCompletedAt: new Date()
  };
  const [response, body] = await patch(`/files/${fileId}`, {
    headers: authHeader(session.id),
    body: updateBody
  });

  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt)
    },
    file,
    'Returns the created file'
  );
  t.equal(response.status, 200, 'Returns with a success status');
  t.equal(updateStub.callCount, 1, 'Update stub is called only once.');
  t.deepEqual(updateStub.args[0][0], fileId);
  t.deepEqual(
    {
      ...updateStub.args[0][1],
      uploadCompletedAt: new Date(updateStub.args[0][1].uploadCompletedAt)
    },
    updateBody
  );
});

test('GET /files/:fileId/upload-policy returns an upload policy', async (t: tape.Test) => {
  const { session } = await createUser();
  const fileId = uuid.v4();

  sandbox()
    .stub(AWSService, 'getUploadPolicy')
    .returns({
      fields: {
        'x-aws-foo': 'bar'
      },
      url: 'stub aws url'
    });

  const [response, body] = await get(
    `/files/${fileId}/upload-policy?mimeType=image%2fpng`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    contentDisposition: `attachment; filename="${fileId}.png"`,
    contentType: 'image/png',
    downloadUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileId}`,
    formData: {
      'x-aws-foo': 'bar'
    },
    remoteFileName: fileId,
    uploadUrl: 'stub aws url'
  });
});
