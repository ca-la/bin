import { test, Test } from '../../test-helpers/fresh';
import { create, findAll } from './index';

test('StageTemplatesDAO supports creation/retrieval', async (t: Test) => {
  await create({
    description: 'It begins',
    title: 'Stage 1'
  });

  const templates = await findAll();
  t.equal(templates.length, 1);
  t.equal(templates[0].title, 'Stage 1');
  t.equal(templates[0].description, 'It begins');
});
