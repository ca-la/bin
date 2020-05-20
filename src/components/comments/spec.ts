import tape from "tape";
import uuid from "node-uuid";
import { test } from "../../test-helpers/fresh";
import { create, deleteById, findById, update } from "./dao";
import createUser = require("../../test-helpers/create-user");

test("Comment DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });

  const result = await findById(comment.id);
  t.deepEqual(result, comment, "Inserted comment matches found");
});

test("Comment DAO supports update", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  const updated = await update({
    ...comment,
    text: "Updated",
  });

  const result = await findById(comment.id);
  t.deepEqual(result, updated, "Updated comment matches found");
});

test("Comment DAO supports delete", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  await deleteById(comment.id);

  const result = await findById(comment.id);
  t.equal(result, null, "Removes comment");
});
