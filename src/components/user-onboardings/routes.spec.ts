import tape from 'tape';

import createUser = require('../../test-helpers/create-user');
import { authHeader, get, put } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import UserOnboarding from './domain-object';
import { create } from './dao';

test('GET /user-onboardings/:userId returns 404 on non-existing onboardings', async (t: tape.Test) => {
  const { user, session } = await createUser();

  const [response] = await get(`/user-onboardings/${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 404, 'Status returned is 404');
});

test('GET /user-onboardings/:userId returns onboarding for user', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const userOnboarding: UserOnboarding = {
    userId: user.id,
    welcomeModalViewedAt: new Date(),
    tasksPageViewedAt: null,
    timelinePageViewedAt: null,
    partnerDashboardViewedAt: null
  };

  await create(userOnboarding);

  const [response, body] = await get(`/user-onboardings/${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200, 'Status returned is 201');
  t.deepEqual(
    { ...body, welcomeModalViewedAt: new Date(body.welcomeModalViewedAt) },
    userOnboarding,
    'Body matches the input'
  );
});

test('PUT /user-onboardings/:userId creates and updates user onboardings', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const userOnboarding: UserOnboarding = {
    userId: user.id,
    welcomeModalViewedAt: new Date(),
    tasksPageViewedAt: null,
    timelinePageViewedAt: null,
    partnerDashboardViewedAt: null
  };

  const userOnboardingUpdate = {
    tasksPageViewedAt: new Date()
  };

  const [response, body] = await put(`/user-onboardings/${user.id}`, {
    body: userOnboarding,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201, 'Status returned is 201');
  t.deepEqual(
    { ...body, welcomeModalViewedAt: new Date(body.welcomeModalViewedAt) },
    userOnboarding,
    'Body matches the input'
  );

  const [response2, body2] = await put(`/user-onboardings/${user.id}`, {
    body: {
      ...userOnboarding,
      ...userOnboardingUpdate
    },
    headers: authHeader(session.id)
  });

  t.equal(response2.status, 201, 'Update status returned is 201');
  t.deepEqual(
    {
      ...body2,
      welcomeModalViewedAt: new Date(body2.welcomeModalViewedAt),
      tasksPageViewedAt: new Date(body2.tasksPageViewedAt)
    },
    {
      ...userOnboarding,
      ...userOnboardingUpdate
    },
    'Update body matches update'
  );

  const [response3, body3] = await put(`/user-onboardings/${user.id}`, {
    body: {
      ...userOnboarding,
      userId: 'some other user'
    },
    headers: authHeader(session.id)
  });

  t.equal(response3.status, 201, 'Update status returned is 201');
  t.deepEqual(
    {
      ...body3,
      welcomeModalViewedAt: new Date(body3.welcomeModalViewedAt)
    },
    userOnboarding,
    'Update body matches update'
  );
});
