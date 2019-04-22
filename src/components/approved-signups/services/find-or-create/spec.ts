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
});
