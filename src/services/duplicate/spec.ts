import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Design = require('../../components/product-designs/domain-objects/product-design');
import createDesign from '../create-design';
import { duplicateDesigns } from './index';

test('findAndDuplicateDesign', async (t: tape.Test) => {
  const { user: ogUser } = await createUser({ withSession: false });
  const { user: duplicatingUser } = await createUser({ withSession: false });

  const designOne = await createDesign({
    productType: 'SHIRT',
    title: 'my dope shirt',
    userId: ogUser.id
  });
  const designTwo = await createDesign({
    productType: 'PANTS',
    title: 'my gangster pants',
    userId: ogUser.id
  });
  const designThree = await createDesign({
    productType: 'SWEATER',
    title: 'my ugly sweater',
    userId: ogUser.id
  });

  const duplicatedDesigns = await duplicateDesigns(duplicatingUser.id, [
    designOne.id,
    designTwo.id,
    designThree.id
  ]);

  const sortedDupes = duplicatedDesigns.sort(
    (a: Design, b: Design): number => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
  );

  t.equal(sortedDupes.length, 3, 'Returns three new designs for the user');
  const dupeOne = sortedDupes[0];
  t.deepEqual(
    dupeOne,
    {
      ...designOne,
      createdAt: dupeOne.createdAt,
      id: dupeOne.id,
      userId: duplicatingUser.id
    },
    'Returns the first design with the same information but with new associations'
  );
  const dupeTwo = sortedDupes[1];
  t.deepEqual(
    dupeTwo,
    {
      ...designTwo,
      createdAt: dupeTwo.createdAt,
      id: dupeTwo.id,
      userId: duplicatingUser.id
    },
    'Returns the second design with the same information but with new associations'
  );
  const dupeThree = sortedDupes[2];
  t.deepEqual(
    dupeThree,
    {
      ...designThree,
      createdAt: dupeThree.createdAt,
      id: dupeThree.id,
      userId: duplicatingUser.id
    },
    'Returns the third design with the same information but with new associations'
  );
});
