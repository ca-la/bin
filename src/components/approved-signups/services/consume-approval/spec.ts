import { omit } from 'lodash';
import * as uuid from 'node-uuid';

import { test, Test } from '../../../../test-helpers/fresh';
import { create } from '../../dao';
import consumeApproval from './index';

test('ApprovedSignups DAO supports updating', async (t: Test) => {
  const id = uuid.v4();

  const signup = await create({
    consumedAt: null,
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id,
    isManuallyApproved: true,
    lastName: 'Bar'
  });

  const updated = await consumeApproval(signup);

  t.deepEqual(
    omit(signup, 'consumedAt'),
    omit(updated, 'consumedAt'),
    'Is the same object'
  );
  t.not(updated.consumedAt, null, 'Set the consumedAt property');
});
