import * as API from '../../../test-helpers/http';
import { sandbox, test, Test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as TemplateDesignsDAO from './dao';
import InvalidDataError = require('../../../errors/invalid-data');

const API_PATH = '/templates/designs';

test(`PUT ${API_PATH}/:designId with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, 'create')
    .resolves({
      designId: 'design-one'
    });

  const [response, body] = await API.put('/templates/designs/design-one', {
    headers: API.authHeader(admin.session.id)
  });

  t.equal(response.status, 201);
  t.deepEqual(body, { designId: 'design-one' });
  t.equal(createStub.callCount, 1);
});

test(`PUT ${API_PATH}/:designId without an admin account`, async (t: Test) => {
  const user = await createUser({ role: 'USER' });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, 'create')
    .resolves({
      designId: 'design-one'
    });

  const [response] = await API.put('/templates/designs/design-one', {
    headers: API.authHeader(user.session.id)
  });

  t.equal(response.status, 403);
  t.equal(createStub.callCount, 0);
});

test(`PUT ${API_PATH}/:designId fails with a known error`, async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, 'create')
    .rejects(new InvalidDataError('Foo'));

  const [response, body] = await API.put('/templates/designs/design-one', {
    headers: API.authHeader(admin.session.id)
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: 'Foo' });
  t.equal(createStub.callCount, 1);
});

test(`PUT ${API_PATH}/:designId fails with an unknown error`, async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, 'create')
    .rejects(new Error('Bizz Bazz'));

  const [response, body] = await API.put('/templates/designs/design-one', {
    headers: API.authHeader(admin.session.id)
  });

  t.equal(response.status, 500);
  t.deepEqual(body, {
    message:
      'Something went wrong! Please try again, or email hi@ca.la if this message persists.'
  });
  t.equal(createStub.callCount, 1);
});

test(`DEL ${API_PATH}/:designId with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, 'remove')
    .resolves({
      designId: 'design-one'
    });

  const [response] = await API.del('/templates/designs/design-one', {
    headers: API.authHeader(admin.session.id)
  });

  t.equal(response.status, 204);
  t.equal(removeStub.callCount, 1);
});

test(`DEL ${API_PATH}/:designId without an admin account`, async (t: Test) => {
  const user = await createUser({ role: 'USER' });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, 'remove')
    .resolves({
      designId: 'design-one'
    });

  const [response] = await API.del('/templates/designs/design-one', {
    headers: API.authHeader(user.session.id)
  });

  t.equal(response.status, 403);
  t.equal(removeStub.callCount, 0);
});

test(`DEL ${API_PATH}/:designId for non-existent resource`, async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, 'remove')
    .rejects(new InvalidDataError('Foo!'));

  const [response, body] = await API.del('/templates/designs/design-one', {
    headers: API.authHeader(admin.session.id)
  });

  t.equal(response.status, 404);
  t.deepEqual(body, { message: 'Foo!' });
  t.equal(removeStub.callCount, 1);
});

test(`GET ${API_PATH}/ with a user account`, async (t: Test) => {
  const user = await createUser({ role: 'USER' });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, 'getAll')
    .resolves([
      {
        designId: 'design-one'
      },
      {
        designId: 'design-two'
      }
    ]);

  const [response, body] = await API.get('/templates/designs', {
    headers: API.authHeader(user.session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(body, [{ designId: 'design-one' }, { designId: 'design-two' }]);
  t.equal(removeStub.callCount, 1);
});
