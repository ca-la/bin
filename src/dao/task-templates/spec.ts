import { test, Test } from '../../test-helpers/fresh';
import { create, findByPhase } from './index';
import * as StageTemplatesDAO from '../stage-templates';

test('TaskTemplatesDAO supports creation/retrieval', async (t: Test) => {
  const stageTemplate = await StageTemplatesDAO.create({
    description: 'It begins',
    ordering: 0,
    title: 'Stage 1'
  });

  await create({
    assigneeRole: 'CALA',
    description: 'Do the thing',
    designPhase: 'POST_CREATION',
    ordering: 0,
    stageTemplateId: stageTemplate.id,
    title: 'Task 1'
  });
  await create({
    assigneeRole: 'CALA',
    description: 'Do another thing',
    designPhase: 'POST_CREATION',
    ordering: 2,
    stageTemplateId: stageTemplate.id,
    title: 'Task 2'
  });
  await create({
    assigneeRole: 'CALA',
    description: 'Do yet another thing',
    designPhase: 'POST_CREATION',
    ordering: 4,
    stageTemplateId: stageTemplate.id,
    title: 'Task 3'
  });

  const templates = await findByPhase('POST_CREATION');
  t.deepEqual(templates.length, 3);
  t.equal(templates[0].title, 'Task 1');
  t.equal(templates[0].description, 'Do the thing');
  t.equal(templates[0].ordering, 0);

  t.equal(templates[1].title, 'Task 2');
  t.equal(templates[1].description, 'Do another thing');
  t.equal(templates[1].ordering, 2);

  t.equal(templates[2].title, 'Task 3');
  t.equal(templates[2].description, 'Do yet another thing');
  t.equal(templates[2].ordering, 4);
});
