import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as UsersDAO from '../../../components/users/dao';
import createUser from '../../../test-helpers/create-user';
import { authHeader, post } from '../../../test-helpers/http';

test('user(id) will not work if not admin authenticated', async (t: Test) => {
  const { session } = await createUser({ role: 'USER' });

  const graphRequest = {
    operationName: null,
    query: `{
      user(id: "blah-blah-blah") {
        birthday
        createdAt
        email
        id
      }
    }`,
    variables: {}
  };

  const [response, body] = await post('/v2', {
    body: graphRequest
  });

  t.equal(response.status, 200);
  t.equal(body.errors[0].message, 'Unauthorized.');

  const [response2, body2] = await post('/v2', {
    body: graphRequest,
    headers: authHeader(session.id)
  });

  t.equal(response2.status, 200);
  t.equal(body2.errors[0].message, 'Unauthorized.');
});

test('user(id) can return a user', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const userStub = sandbox()
    .stub(UsersDAO, 'findById')
    .resolves(user);

  const [response, body] = await post('/v2', {
    body: {
      operationName: null,
      query: `{
        user(id: "${user.id}") {
          birthday
          createdAt
          email
          id
        }
      }`,
      variables: {}
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(body.data.user, {
    birthday: null,
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    id: user.id
  });
  t.equal(userStub.callCount, 1);
});
