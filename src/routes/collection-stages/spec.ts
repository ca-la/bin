import * as collectionStagesDAO from '../../dao/collection-stages';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('POST /collection-stages creates a new stage', async (t: tape.Test) => {
  const { session } = await createUser();

  const collectionStageId = uuid.v4();
  const collectionId = uuid.v4();

  sandbox().stub(collectionStagesDAO, 'create').returns(Promise.resolve(
    {
      collectionId,
      createdAt: '',
      dueDate: '',
      id: collectionStageId,
      title: 'title'
    }
  ));

  const [response, body] = await post('/collection-stages', {
    body: { collectionId, title: 'title' },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, collectionStageId);
});

test('GET /collection-stages returns all stages for a collection', async (t: tape.Test) => {
  const { session } = await createUser();

  const collectionStageId = uuid.v4();
  const collectionId = uuid.v4();

  const findAllStub = sandbox()
    .stub(collectionStagesDAO, 'findAllByCollectionId').
    returns(Promise.resolve([
      {
        collectionId,
        createdAt: '',
        dueDate: '',
        id: collectionStageId,
        title: 'title'
      }
    ]));

  const [response, body] = await get(`/collection-stages?collectionId=${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, collectionStageId);

  t.equal(findAllStub.callCount, 1);
  t.equal(findAllStub.firstCall.args[0], collectionId);
});

test('GET /collection-stages returns 400 if collectionId is not provided', async (t: tape.Test) => {
  const { session } = await createUser();

  const [response, body] = await get('/collection-stages', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.equal(body.message, 'Missing collection ID');
});
