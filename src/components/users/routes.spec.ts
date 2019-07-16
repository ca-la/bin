import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import * as Config from '../../config';
import * as UsersDAO from './dao';
import InvalidDataError = require('../../errors/invalid-data');
import * as PromoCodesDAO from '../../components/promo-codes/dao';
import * as CohortsDAO from '../../components/cohorts/dao';
import * as DuplicationService from '../../services/duplicate';
import * as CreditsDAO from '../../components/credits/dao';
import createUser = require('../../test-helpers/create-user');
import MailChimp = require('../../services/mailchimp');
import { authHeader, get, post, put } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as CohortUsersDAO from '../../components/cohorts/users/dao';
import { baseUser, UserIO } from './domain-object';
import * as ApprovedSignupsDAO from '../../components/approved-signups/dao';
import * as ApprovalConsumer from '../../components/approved-signups/services/consume-approval';
import { pick } from 'lodash';

const USER_DATA: UserIO = Object.freeze({
  email: 'user@example.com',
  name: 'Q User',
  password: 'hunter2',
  phone: '415 580 9925'
});

interface UserDependenciesInterface {
  duplicationStub: sinon.SinonStub;
  mailchimpStub: sinon.SinonStub;
}

function stubUserDependencies(): UserDependenciesInterface {
  const duplicationStub = sandbox()
    .stub(DuplicationService, 'duplicateDesigns')
    .resolves();
  const mailchimpStub = sandbox()
    .stub(MailChimp, 'subscribeToUsers')
    .returns(Promise.resolve());

  return {
    duplicationStub,
    mailchimpStub
  };
}

interface ApprovalDependencies {
  findByEmailStub: sinon.SinonStub;
  updateStub: sinon.SinonStub;
}

function stubApprovalDependencies(): ApprovalDependencies {
  const findByEmailStub = sandbox()
    .stub(ApprovedSignupsDAO, 'findByEmail')
    .resolves({
      consumedAt: null,
      createdAt: new Date('2019-01-03'),
      email: 'foo@example.com',
      firstName: 'Foo',
      id: 'abc-123-xyz',
      lastName: 'Bar'
    });
  const updateStub = sandbox()
    .stub(ApprovalConsumer, 'default')
    .resolves({
      consumedAt: new Date('2019-04-24'),
      createdAt: new Date('2019-01-03'),
      email: 'foo@example.com',
      firstName: 'Foo',
      id: 'abc-123-xyz',
      lastName: 'Bar'
    });

  return {
    findByEmailStub,
    updateStub
  };
}

test('POST /users returns a 400 if user creation fails', async (t: Test) => {
  stubUserDependencies();
  stubApprovalDependencies();

  sandbox()
    .stub(UsersDAO, 'create')
    .rejects(new InvalidDataError('Bad email'));

  const [response, body] = await post('/users', { body: USER_DATA });

  t.equal(response.status, 400, 'status=400');
  t.equal(body.message, 'Bad email');
});

test('POST /users returns new user data', async (t: Test) => {
  stubUserDependencies();
  stubApprovalDependencies();

  const [response, body] = await post('/users', { body: USER_DATA });

  t.equal(response.status, 201, 'status=201');
  t.equal(body.name, 'Q User');
  t.equal(body.email, 'user@example.com');
  t.equal(body.phone, '+14155809925');
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);
});

test('POST /users does not allow private values to be set', async (t: Test) => {
  stubUserDependencies();
  stubApprovalDependencies();

  const data = {
    ...USER_DATA,
    role: 'ADMIN',
    subscriptionWaivedAt: new Date('2019-01-01').toISOString()
  };

  const body = (await post('/users', { body: data }))[1];

  t.equal(body.role, 'USER');
  t.equal(body.subscriptionWaivedAt, null);
});

test('POST /users returns a session instead if requested', async (t: Test) => {
  stubUserDependencies();
  stubApprovalDependencies();

  const [response, body] = await post('/users?returnValue=session', {
    body: USER_DATA
  });
  t.equal(response.status, 201, 'status=201');
  t.equal(body.userId.length, 36);
  t.equal(body.user.name, 'Q User');
});

test('PUT /users/:id/password returns a 401 if unauthenticated', async (t: Test) => {
  const [response, body] = await put('/users/123/password', {
    body: USER_DATA
  });
  t.equal(response.status, 401);
  t.equal(body.message, 'Authorization is required to access this resource');
});

test('PUT /users/:id/password returns a 403 if not the current user', async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await await put('/users/123/password', {
    body: {},
    headers: authHeader(session.id)
  });
  t.equal(response.status, 403);
  t.equal(body.message, 'You can only update your own user');
});

test('PUT /users/:id/password updates the current user', async (t: Test) => {
  const { user, session } = await createUser();
  const [response] = await put(`/users/${user.id}/password`, {
    body: {
      password: 'hunter2'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
});

test('GET /users list returns 401 if not authorized', async (t: Test) => {
  const [response, body] = await get('/users');
  t.equal(response.status, 401);
  t.equal(body.message, 'Unauthorized');
});

test('GET /users list returns 403 if logged in but not admin', async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await get('/users', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 403);
  t.equal(body.message, 'Forbidden');
});

test('GET /users list returns a list of users if authorized', async (t: Test) => {
  let userId: string;

  const { user, session } = await createUser({ role: 'ADMIN' });
  userId = user.id;
  const [response, body] = await get('/users', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, userId);
});

test('GET /users/:id returns a user', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const [response, body] = await get(`/users/${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.name, 'Q User');
});

test('GET /users/email-availability/:email returns false when unavailable', async (t: Test) => {
  const { user } = await createUser();
  const [response, body] = await get(`/users/email-availability/${user.email}`);
  t.equal(response.status, 200);
  t.deepEqual(body, { available: false, isTaken: true, isValid: true });
});

test('GET /users/email-availability/:email returns true when available', async (t: Test) => {
  const [response, body] = await get('/users/email-availability/fuz@buz.qux');
  t.equal(response.status, 200);
  t.deepEqual(body, { available: true, isTaken: false, isValid: true });
});

test('GET /users/email-availability/:email returns false when invalid', async (t: Test) => {
  const [response, body] = await get('/users/email-availability/fizzbuzz');
  t.equal(response.status, 200);
  t.deepEqual(body, { available: false, isTaken: false, isValid: false });
});

test('PUT /users/:id returns a 401 if unauthenticated', async (t: Test) => {
  const [response, body] = await put('/users/123', {
    body: {
      ...baseUser
    }
  });
  t.equal(response.status, 401);
  t.equal(body.message, 'Authorization is required to access this resource');
});

test('PUT /users/:id returns a 403 if not the current user', async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await put('/users/123', {
    body: {},
    headers: authHeader(session.id)
  });
  t.equal(response.status, 403);
  t.equal(body.message, 'You can only update your own user');
});

test('PUT /users/:id updates the current user', async (t: Test) => {
  const { user, session } = await createUser();
  const [response, body] = await put(`/users/${user.id}`, {
    body: {
      birthday: '2017-01-02'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(
    new Date(body.birthday).getMilliseconds(),
    new Date('2017-01-02').getMilliseconds()
  );
});

test('PUT /users/:id does not allow private values to be set', async (t: Test) => {
  const { user, session } = await createUser();
  const [response, body] = await put(`/users/${user.id}`, {
    body: {
      birthday: '2017-01-02',
      role: 'ADMIN',
      subscriptionWaivedAt: new Date('2019-01-01').toISOString()
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);

  t.equal(body.role, 'USER');
  t.equal(body.subscriptionWaivedAt, null);
});

test('PUT /users/:id allows admins to set private values', async (t: Test) => {
  const { user } = await createUser();
  const { session: adminSession } = await createUser({ role: 'ADMIN' });
  const [response, body] = await put(`/users/${user.id}`, {
    body: {
      birthday: '2017-01-02',
      role: 'ADMIN',
      subscriptionWaivedAt: new Date('2019-01-01').toISOString()
    },
    headers: authHeader(adminSession.id)
  });

  t.equal(response.status, 200);

  t.equal(body.role, 'ADMIN');
  t.equal(body.subscriptionWaivedAt, new Date('2019-01-01').toISOString());
});
test('PATCH /users/:id returns errors on taken email', async (t: Test) => {
  const { user: user1, session } = await createUser();
  const { user: user2 } = await createUser();

  const [response, body] = await put(`/users/${user1.id}`, {
    body: {
      email: user2.email
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
});

test('PATCH /users/:id returns error on incorrect password', async (t: Test) => {
  const { user, session } = await createUser();

  const [response, body] = await put(`/users/${user.id}`, {
    body: {
      currentPassword: 'incorrectPassword',
      newPassword: 'hunter3'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
});

test('PATCH /users/:id returns error on password update fail', async (t: Test) => {
  const { user, session } = await createUser();

  sandbox()
    .stub(UsersDAO, 'updatePassword')
    .throws(new InvalidDataError('update failed'));

  const [response, body] = await put(`/users/${user.id}`, {
    body: {
      email: user.email,
      currentPassword: 'hunter2',
      newPassword: '*******'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
  t.true(body.errors[0].name === 'InvalidDataError');
});

test('PATCH /users/:id returns multiple errors', async (t: Test) => {
  const { user: user1, session } = await createUser();
  const { user: user2 } = await createUser();

  const [response, body] = await put(`/users/${user1.id}`, {
    body: {
      email: user2.email,
      currentPassword: 'incorrectPassword',
      newPassword: 'hunter3'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 2);
});

test('POST /users allows registration + design duplication', async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  sandbox()
    .stub(Config, 'DEFAULT_DESIGN_IDS')
    .value([dOne, dTwo, dThree].join(','));
  const mailchimpStub = sandbox()
    .stub(MailChimp, 'subscribeToUsers')
    .returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, 'duplicateDesigns')
    .callsFake(
      async (_: string, designIds: string[]): Promise<void> => {
        t.true(designIds.includes(dOne), 'Contains first design id');
        t.true(designIds.includes(dTwo), 'Contains second design id');
        t.true(designIds.includes(dThree), 'Contains third design id');
      }
    );
  stubApprovalDependencies();

  const [response, body] = await post('/users', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 201, 'status=201');
  t.equal(body.name, 'Rick Owens');
  t.equal(body.email, 'user@example.com');
  t.equal(body.phone, '+13239314960');
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(
    duplicationStub.callCount,
    1,
    'Expect the duplication service to be called once'
  );
  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
});

test('POST /users?initialDesigns= allows registration + design duplication', async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  const mailchimpStub = sandbox()
    .stub(MailChimp, 'subscribeToUsers')
    .returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, 'duplicateDesigns')
    .callsFake(
      async (_: string, designIds: string[]): Promise<void> => {
        t.true(designIds.includes(dOne), 'Contains first design id');
        t.true(designIds.includes(dTwo), 'Contains second design id');
        t.true(designIds.includes(dThree), 'Contains third design id');
      }
    );
  stubApprovalDependencies();

  const [response, body] = await post(
    `/users?initialDesigns=${dOne}&initialDesigns=${dTwo}&initialDesigns=${dThree}`,
    {
      body: {
        email: 'user@example.com',
        name: 'Rick Owens',
        password: 'rick_owens_la_4_lyfe',
        phone: '323 931 4960'
      }
    }
  );

  t.equal(response.status, 201, 'status=201');
  t.equal(body.name, 'Rick Owens');
  t.equal(body.email, 'user@example.com');
  t.equal(body.phone, '+13239314960');
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(
    duplicationStub.callCount,
    1,
    'Expect the duplication service to be called once'
  );
  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
});

test('POST /users?cohort allows registration + adding a cohort user', async (t: Test) => {
  const { mailchimpStub } = stubUserDependencies();
  stubApprovalDependencies();

  const admin = await createUser({ role: 'ADMIN' });
  const cohort = await CohortsDAO.create({
    createdBy: admin.user.id,
    description: 'A bunch of delightful designers',
    id: uuid.v4(),
    slug: 'moma-demo-june-2020',
    title: 'MoMA Demo Participants'
  });

  const [response, newUser] = await post(`/users?cohort=${cohort.slug}`, {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });
  const cohortUser = await CohortUsersDAO.findAllByUser(newUser.id);

  t.equal(response.status, 201, 'status=201');
  t.equal(newUser.name, 'Rick Owens');
  t.equal(newUser.email, 'user@example.com');
  t.equal(newUser.phone, '+13239314960');
  t.equal(newUser.password, undefined);
  t.equal(newUser.passwordHash, undefined);

  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
  t.deepEqual(
    mailchimpStub.firstCall.args[0],
    {
      cohort: 'moma-demo-june-2020',
      email: newUser.email,
      name: newUser.name,
      referralCode: 'n/a'
    },
    'Expect the correct tags for Mailchimp subscription'
  );
  t.deepEqual(
    cohortUser,
    [{ cohortId: cohort.id, userId: newUser.id }],
    'Creates a CohortUser'
  );
});

test('POST /users?promoCode=X applies a code at registration', async (t: Test) => {
  stubUserDependencies();
  stubApprovalDependencies();

  const { user: adminUser } = await createUser({ role: 'ADMIN' });

  await PromoCodesDAO.create({
    code: 'newbie',
    codeExpiresAt: null,
    createdBy: adminUser.id,
    creditAmountCents: 1239,
    creditExpiresAt: null,
    isSingleUse: false
  });

  const [response, newUser] = await post('/users?promoCode=newbie', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 201, 'status=201');
  t.equal(await CreditsDAO.getCreditAmount(newUser.id), 1239);
});

test('GET /users?search with malformed RegExp throws 400', async (t: Test) => {
  const { session } = await createUser({ role: 'ADMIN' });

  const [response, body] = await get('/users?search=(', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: 'Search contained invalid characters' });
});

test('POST /users will fail if the user is not pre-approved', async (t: Test) => {
  sandbox()
    .stub(ApprovedSignupsDAO, 'findByEmail')
    .resolves(null);

  const [response, body] = await post('/users', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 403, 'Is unauthorized');
  t.equal(body.message, 'Sorry, this email address is not approved');
});

test('POST /users?approvedSignupId will fail id is non-existent', async (t: Test) => {
  sandbox()
    .stub(ApprovedSignupsDAO, 'findByEmail')
    .resolves(null);
  sandbox()
    .stub(ApprovedSignupsDAO, 'findById')
    .resolves(null);

  const [response, body] = await post('/users?approvedSignupId=abc-123', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 403, 'Is unauthorized');
  t.equal(body.message, 'Sorry, this email address is not approved');
});

test('POST /users?approvedSignupId will fail if approval has been consumed', async (t: Test) => {
  stubUserDependencies();
  sandbox()
    .stub(ApprovedSignupsDAO, 'findByEmail')
    .resolves(null);
  sandbox()
    .stub(ApprovedSignupsDAO, 'findById')
    .resolves({
      consumedAt: new Date('2019-04-24')
    });
  const updateStub = sandbox()
    .stub(ApprovalConsumer, 'default')
    .resolves({});

  const [response, body] = await post('/users?approvedSignupId=abc-123', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 403, 'Is not authorized');
  t.equal(body.message, 'Sorry, this email registration was already used');
  t.equal(updateStub.callCount, 0, 'Never calls the update');
});

test('POST /users?approvedSignupId will succeed if id exists', async (t: Test) => {
  stubUserDependencies();
  sandbox()
    .stub(ApprovedSignupsDAO, 'findByEmail')
    .resolves(null);
  sandbox()
    .stub(ApprovedSignupsDAO, 'findById')
    .resolves({});
  const updateStub = sandbox()
    .stub(ApprovalConsumer, 'default')
    .resolves({});

  const [response, body] = await post('/users?approvedSignupId=abc-123', {
    body: {
      email: 'user@example.com',
      name: 'Rick Owens',
      password: 'rick_owens_la_4_lyfe',
      phone: '323 931 4960'
    }
  });

  t.equal(response.status, 201, 'Is authorized');
  t.deepEqual(pick(body, 'email', 'name'), {
    email: 'user@example.com',
    name: 'Rick Owens'
  });
  t.true(updateStub.calledOnce, 'Calls update once');
});
