import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findAllByDesignId, findById } from './index';
import { create as createProductDesign } from '../product-designs';
import createUser = require('../../test-helpers/create-user');

test('ProductDesign Stage DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createProductDesign({ productType: 'test', title: 'test', userId: user.id });
  const stage = await create({ designId: design.id, title: 'test', description: '' });

  const result = await findById(stage.id);
  t.deepEqual(result, stage, 'Returned inserted task');
});

test('ProductDesign Stage DAO supports retrieval by designId', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createProductDesign({ productType: 'test', title: 'test', userId: user.id });
  const stage = await create({ designId: design.id, title: 'test', description: '' });

  const result = await findAllByDesignId(stage.designId);
  t.deepEqual(result[0], stage, 'Returned inserted task');
});
