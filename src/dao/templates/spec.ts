import tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findAll } from './index';

test('Templates DAO supports creation/retrieval', async (t: tape.Test) => {
  const inserted = await create({
    description: 'A great starting point',
    title: 'My First Template'
  });

  const results = await findAll();
  t.equal(results.length, 1, 'Returned 1 template');
  t.equal(results[0].id, inserted.id, 'Returned inserted template');
});
