import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';

import * as ApprovedSignupsDAO from './dao';

test('ApprovedSignups DAO supports creation and retrieval', async (t: Test) => {
  const id = uuid.v4();
  const randomId = uuid.v4();
  const signup = await ApprovedSignupsDAO.create({
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id,
    lastName: 'Bar'
  });
  const foundSignup = await ApprovedSignupsDAO.findById(id);
  const notFoundSignup = await ApprovedSignupsDAO.findById(randomId);

  t.deepEqual(signup, foundSignup, 'Expect to successfully create and find the sign up.');
  t.equal(notFoundSignup, null, 'Should not find anything if there is no match');

  const foundByEmail = await ApprovedSignupsDAO.findByEmail('FOO@EXAMPLE.COM');
  const notFoundByEmail = await ApprovedSignupsDAO.findByEmail('bar@example.com');
  t.deepEqual(foundByEmail, foundSignup, 'Can find the record via email');
  t.equal(notFoundByEmail, null, 'Will return null if not found by email');

  try {
    await ApprovedSignupsDAO.create({
      createdAt: new Date('2019-01-03'),
      email: '  fOO@example.com  ',
      firstName: 'Foob',
      id: randomId,
      lastName: 'Barre'
    });
    t.fail('It was able to create a duplicate email row');
  } catch (error) {
    t.equal(error.message, 'Email is already taken', 'Fails to make non-unique singup');
  }
});
