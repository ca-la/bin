import * as designStagesDAO from '../../dao/product-design-stages';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';

test('POST /product-design-stages creates a new stage', async (t: tape.Test) => {
  const { session } = await createUser();

  const productDesignStageId = uuid.v4();
  const designId = uuid.v4();

  sandbox()
    .stub(designStagesDAO, 'create')
    .returns(
      Promise.resolve({
        createdAt: '',
        designId,
        dueDate: '',
        id: productDesignStageId,
        ordering: 0,
        title: 'title'
      })
    );

  const [response, body] = await post('/product-design-stages', {
    body: { designId, ordering: 0, title: 'title' },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, productDesignStageId);
});

test('GET /product-design-stages returns all stages for a collection', async (t: tape.Test) => {
  const { session } = await createUser();

  const designStageId = uuid.v4();
  const designId = uuid.v4();

  const findAllStub = sandbox()
    .stub(designStagesDAO, 'findAllByDesignId')
    .returns(
      Promise.resolve([
        {
          createdAt: '',
          designId,
          dueDate: '',
          id: designStageId,
          ordering: 0,
          title: 'title'
        }
      ])
    );

  const [response, body] = await get(
    `/product-design-stages?designId=${designId}`,
    {
      headers: authHeader(session.id)
    }
  );
  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, designStageId);

  t.equal(findAllStub.callCount, 1);
  t.equal(findAllStub.firstCall.args[0], designId);
});

test('GET /product-design-stages returns 400 if design ID is not provided', async (t: tape.Test) => {
  const { session } = await createUser();

  const [response, body] = await get('/product-design-stages', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 400);
  t.equal(body.message, 'Missing design ID');
});

test('GET /product-design-stages/titles returns all titles for stages', async (t: tape.Test) => {
  const { session } = await createUser();

  const title = 'test';
  const title2 = 'test2';

  const { design, stage } = await generateProductDesignStage({ title });
  await generateProductDesignStage({ title, designId: design.id });
  const { stage: stage2 } = await generateProductDesignStage({
    designId: design.id,
    title: title2
  });

  const [response, body] = await get('/product-design-stages/titles', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.length, 2);
  t.true(body.includes(stage.title), 'Contains the first stage title');
  t.true(body.includes(stage2.title), 'Contains the second stage title');
});
