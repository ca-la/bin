import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findById } from './index';

test('Tasks DAO supports creation/retrieval', async (t: tape.Test) => {
  const inserted = await create();

  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned inserted task');
});
