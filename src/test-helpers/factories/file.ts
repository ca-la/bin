import * as uuid from 'node-uuid';

import { create } from '../../components/files/dao';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import { FileData } from '../../components/files/domain-object';

export default async function generateFile(
  options: Partial<FileData> = {}
): Promise<{ file: FileData; createdBy: User }> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error('Could not get user');
  }

  const file = await create({
    id: options.id || uuid.v4(),
    createdAt: options.createdAt || new Date(),
    createdBy: user.id,
    mimeType: options.mimeType || 'text/csv',
    name: null,
    uploadCompletedAt: null
  });

  return {
    file,
    createdBy: user
  };
}
