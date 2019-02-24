import * as uuid from 'node-uuid';

import * as CreditsDAO from '../../components/credits/dao';
import * as CohortsDAO from '../../components/cohorts/dao';
import * as DuplicationService from '../../services/duplicate';
import createUser = require('../../test-helpers/create-user');
import MailChimp = require('../../services/mailchimp');
import { post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as CohortUsersDAO from '../../components/cohorts/users/dao';

test('POST /users?initialDesigns= allows registration + design duplication', async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  const mailchimpStub = sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, 'duplicateDesigns')
    .callsFake(async (_: string, designIds: string[]): Promise<void> => {
      t.true(designIds.includes(dOne), 'Contains first design id');
      t.true(designIds.includes(dTwo), 'Contains second design id');
      t.true(designIds.includes(dThree), 'Contains third design id');
    });

  const [response, body] = await post(
    `/users?initialDesigns=${dOne}&initialDesigns=${dTwo}&initialDesigns=${dThree}`,
    {
      body: {
        email: 'user@example.com',
        name: 'Rick Owens',
        password: 'rick_owens_la_4_lyfe',
        phone: '323 931 4960',
        zip: '90038'
      }
    }
  );

  t.equal(response.status, 201, 'status=201');
  t.equal(body.name, 'Rick Owens');
  t.equal(body.email, 'user@example.com');
  t.equal(body.phone, '+13239314960');
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(duplicationStub.callCount, 1, 'Expect the duplication service to be called once');
  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
});

test('POST /users?cohort allows registration + adding a cohort user', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const cohort = await CohortsDAO.create({
    createdBy: admin.user.id,
    description: 'A bunch of delightful designers',
    id: uuid.v4(),
    slug: 'moma-demo-june-2020',
    title: 'MoMA Demo Participants'
  });

  const mailchimpStub = sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());

  const [response, newUser] = await post(
    `/users?cohort=${cohort.slug}`,
    {
      body: {
        email: 'user@example.com',
        name: 'Rick Owens',
        password: 'rick_owens_la_4_lyfe',
        phone: '323 931 4960',
        zip: '90038'
      }
    }
  );
  const cohortUser = await CohortUsersDAO.findAllByUser(newUser.id);

  t.equal(response.status, 201, 'status=201');
  t.equal(newUser.name, 'Rick Owens');
  t.equal(newUser.email, 'user@example.com');
  t.equal(newUser.phone, '+13239314960');
  t.equal(newUser.password, undefined);
  t.equal(newUser.passwordHash, undefined);

  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
  t.deepEqual(mailchimpStub.firstCall.args[0], {
    cohort: 'moma-demo-june-2020',
    email: newUser.email,
    name: newUser.name,
    referralCode: 'n/a'
  }, 'Expect the correct tags for Mailchimp subscription');
  t.deepEqual(
    cohortUser,
    [{ cohortId: cohort.id, userId: newUser.id }],
    'Creates a CohortUser'
  );
});

test('POST /users?cohort applies credit to certain cohorts', async (t: Test) => {
  sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());

  const admin = await createUser({ role: 'ADMIN' });
  await CohortsDAO.create({
    createdBy: admin.user.id,
    description: 'A bunch of delightful designers',
    id: uuid.v4(),
    slug: 'workshop-2019-02-24',
    title: 'MoMA Demo Participants'
  });

  const [response, newUser] = await post(
    '/users?cohort=workshop-2019-02-24',
    {
      body: {
        email: 'user@example.com',
        name: 'Rick Owens',
        password: 'rick_owens_la_4_lyfe',
        phone: '323 931 4960',
        zip: '90038'
      }
    }
  );

  t.equal(response.status, 201, 'status=201');
  t.equal(await CreditsDAO.getCreditAmount(newUser.id), 10000);
});
