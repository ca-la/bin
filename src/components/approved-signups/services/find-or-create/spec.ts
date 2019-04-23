import { omit } from 'lodash';
import { test, Test } from '../../../../test-helpers/fresh';
import findOrCreate from './index';

test('findOrCreate can find or create an approval', async (t: Test) => {
  const create1 = await findOrCreate({
    email: 'FOO@example.com',
    firstName: 'Foo',
    lastName: 'Bar'
  });
  t.deepEqual(omit(create1, 'id', 'createdAt'), {
    email: 'foo@example.com',
    firstName: 'Foo',
    lastName: 'Bar'
  }, 'Returns a newly created row');

  const found1 = await findOrCreate({
    email: 'foo@EXAMPLE.com',
    firstName: 'Fooster',
    lastName: 'McBarry'
  });
  t.deepEqual(omit(found1, 'id', 'createdAt'), {
    email: 'foo@example.com',
    firstName: 'Foo',
    lastName: 'Bar'
  }, 'Returns a pre-existing row');

  const create2 = await findOrCreate({
    email: 'bar@example.com',
    firstName: null,
    lastName: null
  });
  t.deepEqual(omit(create2, 'id', 'createdAt'), {
    email: 'bar@example.com',
    firstName: null,
    lastName: null
  }, 'Returns a newly created row');
});
