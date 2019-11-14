import tape from 'tape';

import EmailService = require('../../../services/email');
import * as TaskEventsDAO from '../../../dao/task-events';
import * as CollaboratorsDAO from '../../collaborators/dao';
import * as ProductDesignStagesDAO from '../../../dao/product-design-stages';

import { authHeader, get } from '../../../test-helpers/http';
import { sandbox, test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import createDesign from '../../../services/create-design';

test('GET /product-designs allows getting tasks', async (t: tape.Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());
  sandbox()
    .stub(TaskEventsDAO, 'findByStageId')
    .returns(Promise.resolve([{ id: 'task1234' }]));
  sandbox()
    .stub(CollaboratorsDAO, 'findByTask')
    .returns(Promise.resolve([{ id: 'collaborator1234' }]));
  sandbox()
    .stub(ProductDesignStagesDAO, 'findAllByDesignId')
    .returns(Promise.resolve([{ id: 'stage1234', title: 'stage title' }]));

  const design = await createDesign({
    productType: 'SHIRT',
    title: 'Designer Silk Shirt',
    userId: user.id
  });

  const [response, body] = await get(
    `/product-designs?userId=${user.id}&tasks=true`,
    {
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(body[0].id, design.id);
  t.equal(body[0].stages[0].id, 'stage1234');
  t.equal(body[0].stages[0].tasks[0].id, 'task1234');
  t.equal(body[0].stages[0].tasks[0].assignees[0].id, 'collaborator1234');
});

test('GET /product-designs?search with malformed RegExp throws 400', async (t: tape.Test) => {
  const { session } = await createUser({ role: 'ADMIN' });
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());

  const [response, body] = await get('/product-designs?search=(', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: 'Search contained invalid characters' });
});
