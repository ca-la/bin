import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as ResolveAccountsDAO from './dao';
import generateResolveAccount from '../../test-helpers/factories/resolve-account';

test('Resolve Accounts DAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const id = uuid.v4();
  const createdResolveAccount = await ResolveAccountsDAO.create({
    id,
    resolveCustomerId: '123456',
    userId: user.id
  });
  const foundResolveAccount = await ResolveAccountsDAO.findById(id);

  t.deepEqual(
    createdResolveAccount,
    foundResolveAccount,
    'Creating and finding returns the same instance.'
  );
});

test('Resolve Accounts DAO supports finding all by User Id', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { account: a1 } = await generateResolveAccount({ userId: user.id });
  const { account: a2 } = await generateResolveAccount({ userId: user.id });
  const { account: a3 } = await generateResolveAccount({ userId: user.id });

  const accounts = await ResolveAccountsDAO.findAllByUserId(user.id);
  t.deepEqual(accounts, [a1, a2, a3], 'Returns the accounts for that user');
});
