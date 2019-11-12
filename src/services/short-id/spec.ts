import { test, Test } from '../../test-helpers/fresh';

import { computeUniqueShortId } from './index';

test('computeUniqueShortId can create a short unique identifier', async (t: Test) => {
  const shortId = await computeUniqueShortId();
  t.true(
    shortId.length >= 8,
    'The initial identifier is at least 8 characters long.'
  );

  const anotherId = await computeUniqueShortId();
  t.notEqual(shortId, anotherId, 'Identifiers never match.');
});
