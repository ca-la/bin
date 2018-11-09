import { test, Test } from '../../test-helpers/fresh';
import { create, findByPhase } from './index';
import * as StageTemplatesDAO from '../stage-templates';

test('TaskTemplatesDAO supports creation/retrieval', async (t: Test) => {
  const stageTemplate = await StageTemplatesDAO.create({
    description: 'It begins',
    title: 'Stage 1'
  });

  await create({
    assigneeRole: 'CALA',
    description: 'Do the thing',
    designPhase: 'POST_CREATION',
    stageTemplateId: stageTemplate.id,
    title: 'Task 1'
  });

  const templates = await findByPhase('POST_CREATION');
  t.deepEqual(templates.length, 1);
  t.equal(templates[0].title, 'Task 1');
  t.equal(templates[0].description, 'Do the thing');
});
