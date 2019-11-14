import uuid from 'node-uuid';
import { create } from '../../components/resolve-accounts/dao';
import * as UsersDAO from '../../components/users/dao';
import createUser = require('../create-user');
import ResolveAccount from '../../components/resolve-accounts/domain-object';
import User from '../../components/users/domain-object';

interface ResolveAccountWithResources {
  user: User;
  account: ResolveAccount;
}

export default async function generateResolveAccount(
  options: Partial<ResolveAccount>
): Promise<ResolveAccountWithResources> {
  const user = options.userId
    ? await UsersDAO.findById(options.userId)
    : await createUser({ withSession: false }).then(
        (response: { user: User }): User => response.user
      );

  if (!user) {
    throw new Error('Could not get User');
  }

  const account = await create({
    id: options.id || uuid.v4(),
    resolveCustomerId: options.resolveCustomerId || '123456',
    userId: user.id
  });

  return { user, account };
}
