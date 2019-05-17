import { omit } from 'lodash';
import { test, Test } from '../../../../test-helpers/fresh';
import findOrCreate from './index';

test('findOrCreate can find or create an approval', async (t: Test) => {
  const create1 = await findOrCreate({
    consumedAt: null,
    email: 'FOO@example.com',
    firstName: 'Foo',
    isManuallyApproved: true,
    lastName: 'Bar'
  });
  t.deepEqual(omit(create1, 'id', 'createdAt'), {
    consumedAt: null,
    email: 'foo@example.com',
    firstName: 'Foo',
    isManuallyApproved: true,
    lastName: 'Bar'
  }, 'Returns a newly created row');

  const found1 = await findOrCreate({
    consumedAt: null,
    email: 'foo@EXAMPLE.com',
    firstName: 'Fooster',
    isManuallyApproved: true,
    lastName: 'McBarry'
  });
  t.deepEqual(omit(found1, 'id', 'createdAt'), {
    consumedAt: null,
    email: 'foo@example.com',
    firstName: 'Foo',
    isManuallyApproved: true,
    lastName: 'Bar'
  }, 'Returns a pre-existing row');

  const create2 = await findOrCreate({
    consumedAt: null,
    email: 'bar@example.com',
    firstName: null,
    isManuallyApproved: true,
    lastName: null
  });
  t.deepEqual(omit(create2, 'id', 'createdAt'), {
    consumedAt: null,
    email: 'bar@example.com',
    firstName: null,
    isManuallyApproved: true,
    lastName: null
  }, 'Returns a newly created row');
});
