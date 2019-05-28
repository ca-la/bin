import * as TemplatesDAO from '../../dao/templates';
import * as tape from 'tape';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('GET /templates returns templates', async (t: tape.Test) => {
  const { session } = await createUser();

  sandbox()
    .stub(TemplatesDAO, 'findAll')
    .returns(Promise.resolve([{ id: 'template-123' }]));

  const [response, body] = await get('/templates', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].id, 'template-123');
});
