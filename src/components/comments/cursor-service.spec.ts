import Knex from "knex";
import uuid from "node-uuid";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";
import generateComment from "../../test-helpers/factories/comment";
import { generateTeam } from "../../test-helpers/factories/team";
import { test, Test } from "../../test-helpers/fresh";

import * as CursorService from "./cursor-service";

test("CursorService.getPreviousPage", async (t: Test) => {
  const testTime = new Date();
  const commentId = uuid.v4();
  const { comment: comment1 } = await generateComment();
  const { comment: comment2 } = await generateComment();
  const { comment: comment3 } = await generateComment({
    id: commentId,
    createdAt: testTime,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const fullPage = await CursorService.getPreviousPage({
      ktx: trx,
      comments: [comment1, comment2, comment3],
      currentCursor: "currentCursor",
      limit: 2,
    });

    t.deepEqual(
      fullPage,
      {
        data: await CursorService.addCommentResources(trx, [
          comment2,
          comment1,
        ]),
        nextCursor: "currentCursor",
        previousCursor: CursorService.createCursor({
          createdAt: testTime,
          id: commentId,
        }),
      },
      "A full previous page has correct data and cursors"
    );

    const partialPage = await CursorService.getPreviousPage({
      ktx: trx,
      comments: [comment1, comment2],
      currentCursor: "currentCursor",
      limit: 2,
    });

    t.deepEqual(
      partialPage,
      {
        data: await CursorService.addCommentResources(trx, [
          comment2,
          comment1,
        ]),
        nextCursor: "currentCursor",
        previousCursor: null,
      },
      "A partial previous page has correct data and cursors"
    );
  });
});

test("CursorService.getNextPage", async (t: Test) => {
  const testTime = new Date();
  const commentId = uuid.v4();
  const { comment: comment1 } = await generateComment();
  const { comment: comment2 } = await generateComment();
  const { comment: comment3 } = await generateComment({
    id: commentId,
    createdAt: testTime,
  });
  const { comment: comment4 } = await generateComment();

  await db.transaction(async (trx: Knex.Transaction) => {
    const fullPage = await CursorService.getNextPage({
      ktx: trx,
      comments: [comment1, comment2, comment3, comment4],
      currentCursor: "currentCursor",
      limit: 2,
    });

    t.deepEqual(
      fullPage,
      {
        data: await CursorService.addCommentResources(trx, [
          comment2,
          comment3,
        ]),
        previousCursor: "currentCursor",
        nextCursor: CursorService.createCursor({
          createdAt: testTime,
          id: commentId,
        }),
      },
      "A full next page has correct data and cursors"
    );

    const partialPage = await CursorService.getNextPage({
      ktx: trx,
      comments: [comment1, comment2, comment3],
      currentCursor: "currentCursor",
      limit: 2,
    });

    t.deepEqual(
      partialPage,
      {
        data: await CursorService.addCommentResources(trx, [
          comment2,
          comment3,
        ]),
        previousCursor: "currentCursor",
        nextCursor: null,
      },
      "A partial next page has correct data and cursors"
    );
  });
});

test("addCommentResources - adds mention details", async (t: Test) => {
  const testTime = new Date();
  const commentId = uuid.v4();
  const { user } = await createUser();
  const { teamUser } = await generateTeam(user.id);
  const { comment } = await generateComment({
    id: commentId,
    createdAt: testTime,
    text: `A comment @<${teamUser.id}|teamUser>`,
  });

  const commentWithResources = await db.transaction((trx: Knex.Transaction) =>
    CursorService.addCommentResources(trx, [comment])
  );

  t.deepEqual(
    commentWithResources,
    [{ ...comment, mentions: [{ id: teamUser.id, name: "Q User" }] }],
    "adds mentions"
  );
});
