import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get } from '../../test-helpers/http';

test('validatePagination middleware', async (t: tape.Test) => {
  const { session } = await createUser();
  const [validResponse] = await get('/product-design-options?limit=10&offset=20', {
    headers: authHeader(session.id)
  });
  t.equal(validResponse.status, 200, 'allows positive offset value');

  const [negativeOffset] = await get('/product-design-options?limit=10&offset=-20', {
    headers: authHeader(session.id)
  });
  t.equal(negativeOffset.status, 400, 'disallows negative offset value');

  const [negativeRange] = await get('/product-design-options?limit=-10&offset=20', {
    headers: authHeader(session.id)
  });
  t.equal(negativeRange.status, 400, 'disallows negative limit value');
});
