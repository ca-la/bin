import * as uuid from 'node-uuid';

import { create } from '../../dao/comments';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');
import User from '../../domain-objects/user';
import Comment from '../../domain-objects/comment';

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
    userEmail: user.email,
    userId: user.id,
    userName: user.name
  });

  return {
    comment,
    createdBy: user
  };
}
