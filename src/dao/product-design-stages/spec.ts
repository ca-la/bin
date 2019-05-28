import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findAllByDesignId, findById } from './index';
import { create as createProductDesign } from '../product-designs';
import createUser = require('../../test-helpers/create-user');

test('ProductDesign Stage DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createProductDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const stage = await create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  const result = await findById(stage.id);
  t.deepEqual(result, stage, 'Returned inserted task');
});

test('ProductDesign Stage DAO supports retrieval by designId', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createProductDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const stage = await create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const stageTwo = await create({
    description: '',
    designId: design.id,
    ordering: 1,
    title: 'test 2'
  });
  const stageThree = await create({
    description: '',
    designId: design.id,
    ordering: 2,
    title: 'test 3'
  });

  const result = await findAllByDesignId(stage.designId);
  t.deepEqual(result[0], stage, 'Returned inserted design stage');
  t.deepEqual(result[1], stageTwo, 'Returned inserted design stage');
  t.deepEqual(result[2], stageThree, 'Returned inserted design stage');
});
