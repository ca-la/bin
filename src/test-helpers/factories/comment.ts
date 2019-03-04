import * as uuid from 'node-uuid';

import { create } from '../../components/comments/dao';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');
import User = require('../../domain-objects/user');
import Comment from '../../components/comments/domain-object';

export default async function generateComment(
  options: Partial<Comment> = {}
): Promise<{ comment: Comment, createdBy: User }> {
  const { user }: { user: User } = options.userName
    ? { user: await findUserById(options.userName) }
    : await createUser({ withSession: false });

  const comment = await create({
    createdAt: options.createdAt || new Date(),
    deletedAt: options.deletedAt || null,
    id: options.id || uuid.v4(),
    isPinned: options.isPinned || false,
    parentCommentId: options.parentCommentId || null,
    text: options.text || 'test comment',
    userId: user.id
  });

  return {
    comment,
    createdBy: user
  };
}
