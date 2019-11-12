import { test, Test } from '../../test-helpers/fresh';

import sequenceIncrement from './index';

test('retrieveIncrement retrieves an increment sequentially', async (t: Test) => {
  const increment = await sequenceIncrement('short_id_increment');
  const increment2 = await sequenceIncrement('short_id_increment');
  const increment3 = await sequenceIncrement('short_id_increment');

  t.true(
    increment2 > increment,
    'The second increment is larger than the first.'
  );
  t.true(increment3 > increment2, 'The third is larger than the second.');
});
