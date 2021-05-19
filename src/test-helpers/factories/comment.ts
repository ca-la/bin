import uuid from "node-uuid";

import { create } from "../../components/comments/dao";
import { findById as findUserById } from "../../components/users/dao";
import createUser from "../create-user";
import User from "../../components/users/domain-object";
import Comment from "../../components/comments/types";

export default async function generateComment(
  options: Partial<Comment> = {}
): Promise<{ comment: Comment; createdBy: User }> {
  const { user }: { user: User | null } = options.userId
    ? { user: await findUserById(options.userId) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error("Could not get user");
  }

  const comment = await create(
    {
      createdAt: options.createdAt || new Date(),
      deletedAt: options.deletedAt || null,
      id: options.id || uuid.v4(),
      isPinned: options.isPinned || false,
      parentCommentId: options.parentCommentId || null,
      text: options.text || "test comment",
      userId: user.id,
    },
    undefined,
    { excludeDeletedAt: false }
  );

  return {
    comment,
    createdBy: user,
  };
}
