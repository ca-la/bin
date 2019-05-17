import * as uuid from 'node-uuid';

import { authHeader, get, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as ApprovedSignupsDAO from './dao';
import * as Mailchimp from '../../services/mailchimp';
import createUser = require('../../test-helpers/create-user');
import { omit } from 'lodash';
import { MAGIC_HOST, MAILCHIMP_LIST_ID_DESIGNERS, STUDIO_HOST } from '../../config';

const API_PATH = '/approved-signups';

test(`POST ${API_PATH}/ creates an approved signup with minimal data`, async (t: Test) => {
  const mailchimpStub = sandbox().stub(Mailchimp, 'addOrUpdateListMember').resolves({});
  const signupStub = sandbox().stub(ApprovedSignupsDAO, 'create').resolves({
    createdAt: new Date('2019-01-02').toISOString(),
    email: 'barry@example.com',
    firstName: 'Barry',
    id: 'abc-123',
    lastName: 'Fooster'
  });
  const { session } = await createUser({ role: 'ADMIN' });
  const data = {
    email: 'barry@example.com',
    firstName: 'Barry',
    lastName: 'Fooster'
  };
  const [response, body] = await post(`${API_PATH}/`, {
    body: data,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201, 'Succeeds');
  t.deepEqual(
    omit(body, 'id', 'createdAt'),
    data,
    'Returns the approved signup row'
  );
  t.true(signupStub.calledOnce);
  t.true(mailchimpStub.calledOnceWith(MAILCHIMP_LIST_ID_DESIGNERS, 'barry@example.com', {
    APPROVED: 'TRUE',
    FNAME: 'Barry',
    INSTA: undefined,
    LANGUAGE: 'en',
    LNAME: 'Fooster',
    MANAPPR: 'TRUE',
    REGLINK: `${STUDIO_HOST}/register?approvedSignupId=abc-123`,
    SOURCE: MAGIC_HOST
  }));
});

test(`POST ${API_PATH}/ creates an approved signup`, async (t: Test) => {
  const mailchimpStub = sandbox().stub(Mailchimp, 'addOrUpdateListMember').resolves({});
  const { session } = await createUser({ role: 'ADMIN' });
  const data = {
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id: uuid.v4(),
    isManuallyApproved: true,
    lastName: 'Bar'
  };
  const [response, body] = await post(`${API_PATH}/`, {
    body: data,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201, 'Succeeds');
  t.deepEqual(
    omit(body, 'createdAt', 'consumedAt'),
    omit(data, 'createdAt'),
    'Returns the approved signup row'
  );

  const [failedResponse, failedBody] = await post(`${API_PATH}/`, {
    body: { ...data, id: uuid.v4() },
    headers: authHeader(session.id)
  });
  t.equal(failedResponse.status, 400);
  t.equal(failedBody.message, 'Email is already taken');
  t.true(mailchimpStub.calledOnce);
});

test(`POST ${API_PATH}/ will fail with incomplete data`, async (t: Test) => {
  const mailchimpStub = sandbox().stub(Mailchimp, 'addOrUpdateListMember').resolves({});
  const { session } = await createUser({ role: 'ADMIN' });
  const data = {
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    id: uuid.v4()
  };
  const [response, body] = await post(`${API_PATH}/`, {
    body: data,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400, 'Fails');
  t.equal(body.message, 'Request does not match the Approved Signup properties.');
  t.false(mailchimpStub.calledOnce);
});

test(`GET ${API_PATH}/:approvedSignupId will fetch a row`, async (t: Test) => {
  const signupStub = sandbox().stub(ApprovedSignupsDAO, 'findById').resolves({
    createdAt: new Date('2019-01-02').toISOString(),
    email: 'foo@example.com',
    firstName: 'Foo',
    id: 'abc-123',
    isManuallyApproved: true,
    lastName: 'Bar'
  });

  const [response, body] = await get(`${API_PATH}/abc-123`);

  t.equal(response.status, 200, 'Succeeds');
  t.deepEqual(body, {
    createdAt: new Date('2019-01-02').toISOString(),
    email: 'foo@example.com',
    firstName: 'Foo',
    id: 'abc-123',
    isManuallyApproved: true,
    lastName: 'Bar'
  });
  t.true(signupStub.calledOnceWith('abc-123'));
});

test(`GET ${API_PATH}/:approvedSignupId will 404 if not found`, async (t: Test) => {
  const signupStub = sandbox().stub(ApprovedSignupsDAO, 'findById').resolves(null);

  const [response, body] = await get(`${API_PATH}/abc-123`);

  t.equal(response.status, 404, 'Fails');
  t.deepEqual(body.message, 'Approved signup not found for id abc-123.');
  t.true(signupStub.calledOnceWith('abc-123'));
});
