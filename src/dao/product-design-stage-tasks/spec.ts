import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create, findAllByDesignId, findById } from './index';
import { create as createTask } from '../tasks';
import { create as createDesign } from '../product-designs';
import { create as createDesignStage } from '../product-design-stages';
import createUser = require('../../test-helpers/create-user');

test('ProductDesign Stage Task DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const design = await createDesign({ productType: 'test', title: 'test', userId: user.id });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const stageTask = await create({ designStageId: stage.id, taskId: task.id });

  const result = await findById(stageTask.id);
  t.deepEqual(result, stageTask, 'Returned inserted task');
});

test('ProductDesign Stage Task DAO supports retrieval by designId', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const design = await createDesign({ productType: 'test', title: 'test', userId: user.id });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const stageTask = await create({ designStageId: stage.id, taskId: task.id });

  const result = await findAllByDesignId(design.id);
  t.deepEqual(result[0], stageTask, 'Returned inserted task');
});
