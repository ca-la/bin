import { test, Test } from '../../test-helpers/fresh';

import { computeUniqueUPC } from './index';

test('computeUniqueUPC can create a universal product code', async (t: Test) => {
  const upc = await computeUniqueUPC();
  t.true(upc.match(/^\d{12}$/), 'Is a valid upc');

  const anotherId = await computeUniqueUPC();
  t.notEqual(upc, anotherId, "Identifiers don't match.");
});
