import { test, Test } from '../../test-helpers/fresh';

import { computeUniqueShortId, retrieveIncrement } from './index';

test('computeUniqueShortId can create a short unique identifier', async (t: Test) => {
  const shortId = await computeUniqueShortId();
  t.true(
    shortId.length >= 8,
    'The initial identifier is at least 8 characters long.'
  );

  const anotherId = await computeUniqueShortId();
  t.notEqual(shortId, anotherId, 'Identifiers never match.');
});

test('retrieveIncrement retrieves an increment sequentially', async (t: Test) => {
  const increment = await retrieveIncrement();
  const increment2 = await retrieveIncrement();
  const increment3 = await retrieveIncrement();

  t.true(
    increment2 > increment,
    'The second increment is larger than the first.'
  );
  t.true(increment3 > increment2, 'The third is larger than the second.');
});
