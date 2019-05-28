import { omit } from 'lodash';
import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';

import * as ApprovedSignupsDAO from './dao';

test('ApprovedSignups DAO returns null if the id is malformed', async (t: Test) => {
  const result = await ApprovedSignupsDAO.findById('abc-123');
  t.equal(result, null, 'Returns nothing if the identifier is invalid');
});

test('ApprovedSignups DAO supports creation and retrieval', async (t: Test) => {
  const id = uuid.v4();
  const randomId = uuid.v4();
  const signup = await ApprovedSignupsDAO.create({
    consumedAt: null,
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id,
    isManuallyApproved: true,
    lastName: 'Bar'
  });
  const foundSignup = await ApprovedSignupsDAO.findById(id);
  const notFoundSignup = await ApprovedSignupsDAO.findById(randomId);

  t.deepEqual(
    signup,
    foundSignup,
    'Expect to successfully create and find the sign up.'
  );
  t.equal(
    notFoundSignup,
    null,
    'Should not find anything if there is no match'
  );

  const foundByEmail = await ApprovedSignupsDAO.findByEmail('FOO@EXAMPLE.COM');
  const notFoundByEmail = await ApprovedSignupsDAO.findByEmail(
    'bar@example.com'
  );
  t.deepEqual(foundByEmail, foundSignup, 'Can find the record via email');
  t.equal(notFoundByEmail, null, 'Will return null if not found by email');

  try {
    await ApprovedSignupsDAO.create({
      consumedAt: null,
      createdAt: new Date('2019-01-03'),
      email: '  fOO@example.com  ',
      firstName: 'Foob',
      id: randomId,
      isManuallyApproved: true,
      lastName: 'Barre'
    });
    t.fail('It was able to create a duplicate email row');
  } catch (error) {
    t.equal(
      error.message,
      'Email is already taken',
      'Fails to make non-unique singup'
    );
  }
});

test('ApprovedSignups DAO supports updating', async (t: Test) => {
  const id = uuid.v4();

  const signup = await ApprovedSignupsDAO.create({
    consumedAt: null,
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id,
    isManuallyApproved: true,
    lastName: 'Bar'
  });

  const updated = await ApprovedSignupsDAO.update({
    ...signup,
    consumedAt: new Date('2019-01-03')
  });

  t.deepEqual(
    omit(signup, 'consumedAt'),
    omit(updated, 'consumedAt'),
    'Is the same object'
  );

  if (!updated.consumedAt) {
    throw new Error('consumedAt is not defined!');
  }

  t.equal(
    new Date(updated.consumedAt).toISOString(),
    new Date('2019-01-03').toISOString(),
    'Returns the date that was updated'
  );
});
