import * as collectionStagesDAO from '../../dao/collection-stages';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, post } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('POST /tasks/:taskId returns task', async (t: tape.Test) => {
  const { session } = await createUser();

  const collectionStageId = uuid.v4();

  sandbox().stub(collectionStagesDAO, 'create').returns(Promise.resolve(
    {
      collectionId: collectionStageId,
      createdAt: '',
      dueDate: '',
      id: collectionStageId,
      title: 'title'
    }
  ));

  const [response, body] = await post('/collection-stages', {
    body: { collectionId: collectionStageId, title: 'title' },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, collectionStageId);
});
