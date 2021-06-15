import tape from "tape";

import { test } from "../../test-helpers/fresh";
import { create as createTask } from "../../dao/tasks";
import { create, findByTaskId } from "./dao";
import createUser from "../../test-helpers/create-user";
import generateComment from "../../test-helpers/factories/comment";

test("TaskComment DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const { comment: comment1 } = await generateComment({
    createdAt: now,
    deletedAt: null,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  const { comment: comment2 } = await generateComment({
    createdAt: yesterday,
    deletedAt: null,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });

  const { comment: deletedComment } = await generateComment({
    createdAt: new Date(2010, 10, 1),
    deletedAt: new Date(2012, 10, 2),
    parentCommentId: null,
    text: "A deleted comment",
    userId: user.id,
  });
  const { comment: replyToDeleted1 } = await generateComment({
    createdAt: new Date(2011, 10, 1),
    deletedAt: null,
    parentCommentId: deletedComment.id,
    text: "A deleted comment",
    userId: user.id,
  });
  const { comment: replyToDeleted2 } = await generateComment({
    createdAt: new Date(2012, 8, 1),
    deletedAt: new Date(2012, 10, 5),
    parentCommentId: deletedComment.id,
    text: "A deleted comment",
    userId: user.id,
  });

  const task = await createTask();
  await create({
    commentId: comment1.id,
    taskId: task.id,
  });
  await create({
    commentId: comment2.id,
    taskId: task.id,
  });
  await create({
    commentId: deletedComment.id,
    taskId: task.id,
  });
  await create({
    commentId: replyToDeleted1.id,
    taskId: task.id,
  });
  await create({
    commentId: replyToDeleted2.id,
    taskId: task.id,
  });

  const result = await findByTaskId(task.id);
  t.deepEqual(
    result,
    [{ ...deletedComment, replyCount: 1 }, replyToDeleted1, comment2, comment1],
    "Finds comments by task (even deleted if they have replies)"
  );
});
