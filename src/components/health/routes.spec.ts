import { sandbox, test, Test } from '../../test-helpers/fresh';
import API from '../../test-helpers/http';
import * as NotificationsDAO from '../notifications/dao';
import createUser = require('../../test-helpers/create-user');

const API_PATH = '/health';

test(`GET ${API_PATH}/notifications can check on the empty case`, async (t: Test) => {
  const { session: adminSession } = await createUser({ role: 'ADMIN' });
  const notificationsStub = sandbox()
    .stub(NotificationsDAO, 'findOutstanding')
    .resolves([]);
  const [response, body] = await API.get(`${API_PATH}/notifications`, {
    headers: API.authHeader(adminSession.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    oldestCreatedAt: null,
    outstandingNotifications: 0
  });
  t.equal(notificationsStub.callCount, 1);
});

test(`GET ${API_PATH}/notifications can check on the non-empty case`, async (t: Test) => {
  const { session: adminSession } = await createUser({ role: 'ADMIN' });
  const notificationsStub = sandbox()
    .stub(NotificationsDAO, 'findOutstanding')
    .resolves([
      { createdAt: new Date('2019-06-30') },
      { createdAt: new Date('2019-04-20') }
    ]);
  const [response, body] = await API.get(`${API_PATH}/notifications`, {
    headers: API.authHeader(adminSession.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(
    {
      ...body,
      oldestCreatedAt: new Date(body.oldestCreatedAt)
    },
    {
      oldestCreatedAt: new Date('2019-04-20'),
      outstandingNotifications: 2
    }
  );
  t.equal(notificationsStub.callCount, 1);
});
