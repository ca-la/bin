import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import { create, findByUserId } from './dao';
import createUser = require('../../test-helpers/create-user');
import { toDateStringOrNull } from '../../services/to-date';

test('UserOnboarding DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const now = new Date();

  const created = await create({
    userId: user.id,
    welcomeModalViewedAt: now,
    tasksPageViewedAt: null,
    timelinePageViewedAt: null,
    partnerDashboardViewedAt: null
  });

  const result = await findByUserId(user.id);
  t.deepEqual(result, created, 'Finds user onboarding by user id');

  await create({
    userId: user.id,
    welcomeModalViewedAt: now,
    tasksPageViewedAt: now,
    timelinePageViewedAt: null,
    partnerDashboardViewedAt: null
  });

  const updated = await findByUserId(user.id);
  if (!updated) {
    throw new Error('Updated Value not found!');
  }

  t.equal(
    toDateStringOrNull(updated.tasksPageViewedAt),
    now.toISOString(),
    'Updates the values'
  );

  const notFound = await findByUserId('12341234-1234-1234-1234-123412341234');
  t.equal(notFound, null, 'returns null if not found');
});
