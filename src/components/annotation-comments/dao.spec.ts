import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import { create as createAnnotation } from "../product-design-canvas-annotations/dao";
import { deleteById as deleteComment } from "../comments/dao";
import { create, findByAnnotationId, findByAnnotationIds } from "./dao";
import createUser from "../../test-helpers/create-user";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateComment from "../../test-helpers/factories/comment";
import db from "../../services/db";
import createDesign from "../../services/create-design";
import { createCommentPaginationModifier } from "../comments/cursor-service";
import { generateAnnotationComment } from "../../test-helpers/factories/annotation-comment";

const baseComment = {
  createdAt: new Date(),
  deletedAt: null,
  isPinned: false,
  parentCommentId: null,
  text: "A comment",
};

async function setup() {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: user.id,
  });
  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Green Tee",
    width: 200,
    x: 0,
    y: 0,
  });
  const annotation = await db.transaction((trx: Knex.Transaction) =>
    createAnnotation(trx, {
      canvasId: designCanvas.id,
      createdBy: user.id,
      deletedAt: null,
      id: uuid.v4(),
      x: 20,
      y: 10,
    })
  );

  return {
    user,
    design,
    designCanvas,
    annotation,
  };
}

test("ProductDesignCanvasAnnotationComment DAO supports creation/retrieval", async (t: tape.Test) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const { user, annotation } = await setup();

  const { comment: comment1 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2010, 2, 1),
      id: uuid.v4(),
      userId: user.id,
      text: "A comment 1",
    },
  });
  const { comment: comment2 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2011, 2, 1),
      id: uuid.v4(),
      userId: user.id,
      text: "A comment 2",
    },
  });
  const { comment: deletedComment } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2012, 2, 1),
      deletedAt: new Date(2012, 3, 1),
      id: uuid.v4(),
      text: "A deleted comment",
      userId: user.id,
    },
  });
  await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      id: uuid.v4(),
      createdAt: new Date(2014, 2, 1),
      deletedAt: new Date(2014, 3, 1),
      text: "A deleted comment without replies",
      userId: user.id,
    },
  });

  const { comment: reply } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2013, 2, 1),
      id: uuid.v4(),
      parentCommentId: deletedComment.id,
      text: "A reply to deleted comment",
      userId: user.id,
    },
  });

  const result = await findByAnnotationId(db, { annotationId: annotation.id });
  t.deepEqual(
    result,
    [
      {
        ...comment1,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment2,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...deletedComment,
        annotationId: annotation.id,
        replyCount: 1,
      },
      {
        ...reply,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Finds comments by annotation"
  );
});

test("findByAnnotationId supports fetching pages in both order", async (t: tape.Test) => {
  const { user, annotation } = await setup();
  const { comment: comment1 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 1),
      id: uuid.v4(),
      userId: user.id,
    },
  });
  const { comment: comment2 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 2),
      id: "00000000-0000-0000-0000-000000000000",
      userId: user.id,
    },
  });
  const { comment: comment3 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 2),
      id: "11111111-1111-1111-1111-111111111111",
      userId: user.id,
    },
  });
  const { comment: comment4 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 3),
      id: uuid.v4(),
      userId: user.id,
    },
  });

  const firstPageDesc = await findByAnnotationId(db, {
    annotationId: annotation.id,
    limit: 2,
    sortOrder: "desc",
  });
  t.deepEqual(
    firstPageDesc,
    [
      {
        ...comment4,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment3,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Returns first page with latest comments"
  );
  const secondPageDesc = await findByAnnotationId(db, {
    annotationId: annotation.id,
    limit: 2,
    sortOrder: "desc",
    modify: createCommentPaginationModifier({
      cursor: { createdAt: comment2.createdAt, id: comment2.id },
      sortOrder: "desc",
      parentCommentId: null,
    }),
  });
  t.deepEqual(
    secondPageDesc,
    [
      {
        ...comment2,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment1,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Returns a full page with the older comments"
  );

  const firstPageAsc = await findByAnnotationId(db, {
    annotationId: annotation.id,
    limit: 2,
    sortOrder: "asc",
  });
  t.deepEqual(
    firstPageAsc,
    [
      {
        ...comment1,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment2,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Returns page with oldest comments"
  );
  const secondPageAsc = await findByAnnotationId(db, {
    annotationId: annotation.id,
    limit: 2,
    sortOrder: "asc",
    modify: createCommentPaginationModifier({
      cursor: { createdAt: comment3.createdAt, id: comment3.id },
      sortOrder: "asc",
      parentCommentId: null,
    }),
  });
  t.deepEqual(
    secondPageAsc,
    [
      {
        ...comment3,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment4,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Returns a full page with the newer comments"
  );
});

test("findByAnnotationId supports fetching a page for a reply thread", async (t: tape.Test) => {
  const { user, annotation } = await setup();
  const { comment: comment1 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 1),
      id: uuid.v4(),
      userId: user.id,
    },
  });
  const { comment: comment2 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 2),
      id: "00000000-0000-0000-0000-000000000000",
      userId: user.id,
      parentCommentId: comment1.id,
    },
  });
  const { comment: comment3 } = await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 2),
      id: "11111111-1111-1111-1111-111111111111",
      userId: user.id,
      parentCommentId: comment1.id,
    },
  });
  await generateAnnotationComment({
    annotationId: annotation.id,
    comment: {
      ...baseComment,
      createdAt: new Date(2020, 0, 3),
      id: uuid.v4(),
      userId: user.id,
    },
  });

  const firstPageAsc = await findByAnnotationId(db, {
    annotationId: annotation.id,
    limit: 2,
    sortOrder: "asc",
    modify: createCommentPaginationModifier({
      cursor: null,
      sortOrder: "asc",
      parentCommentId: comment1.id,
    }),
  });
  t.deepEqual(
    firstPageAsc,
    [
      {
        ...comment2,
        annotationId: annotation.id,
        replyCount: 0,
      },
      {
        ...comment3,
        annotationId: annotation.id,
        replyCount: 0,
      },
    ],
    "Returns a  page of replies"
  );
});

test("findByAnnotationIds", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { canvas } = await generateCanvas({ createdBy: user.id });
  const { annotation: annotationOne } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });
  const { annotation: annotationTwo } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });
  const { annotation: annotationThree } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });

  const { comment: c1, createdBy: c1Creator } = await generateComment();
  const { comment: c2, createdBy: c2Creator } = await generateComment({
    parentCommentId: c1.id,
  });
  const { comment: c3, createdBy: c3Creator } = await generateComment({
    parentCommentId: c1.id,
  });
  const { comment: deletedComment } = await generateComment({
    parentCommentId: c1.id,
    deletedAt: new Date(),
  });
  const { comment: c4, createdBy: c4Creator } = await generateComment();
  const { comment: c5, createdBy: c5Creator } = await generateComment();

  await create({ annotationId: annotationOne.id, commentId: c1.id });
  await create({ annotationId: annotationOne.id, commentId: c2.id });
  await create({ annotationId: annotationOne.id, commentId: c3.id });
  await create({
    annotationId: annotationOne.id,
    commentId: deletedComment.id,
  });
  await create({ annotationId: annotationOne.id, commentId: c4.id });
  await create({ annotationId: annotationTwo.id, commentId: c5.id });

  const result = await db.transaction((trx: Knex.Transaction) =>
    findByAnnotationIds(trx, [
      annotationOne.id,
      annotationTwo.id,
      annotationThree.id,
    ])
  );

  t.equal(
    Object.keys(result).length,
    2,
    "Returns only the annotations with comments"
  );
  t.deepEqual(result[annotationOne.id], [
    {
      ...c1,
      mentions: {},
      userEmail: c1Creator.email,
      userName: c1Creator.name,
      replyCount: 2,
    },
    {
      ...c2,
      mentions: {},
      userEmail: c2Creator.email,
      userName: c2Creator.name,
      replyCount: 0,
    },
    {
      ...c3,
      mentions: {},
      userEmail: c3Creator.email,
      userName: c3Creator.name,
      replyCount: 0,
    },
    {
      ...c4,
      mentions: {},
      userEmail: c4Creator.email,
      userName: c4Creator.name,
      replyCount: 0,
    },
  ]);
  t.deepEqual(result[annotationTwo.id], [
    {
      ...c5,
      mentions: {},
      userEmail: c5Creator.email,
      userName: c5Creator.name,
      replyCount: 0,
    },
  ]);

  // deleting a comment should remove it from the list of comments.
  await deleteComment(c2.id);
  const result2 = await db.transaction((trx: Knex.Transaction) =>
    findByAnnotationIds(trx, [annotationOne.id, annotationThree.id])
  );

  t.equal(
    Object.keys(result2).length,
    1,
    "Returns annotations with undeleted comments"
  );
  t.deepEqual(result2[annotationOne.id], [
    {
      ...c1,
      mentions: {},
      userEmail: c1Creator.email,
      userName: c1Creator.name,
      replyCount: 1,
    },
    {
      ...c3,
      mentions: {},
      userEmail: c3Creator.email,
      userName: c3Creator.name,
      replyCount: 0,
    },
    {
      ...c4,
      mentions: {},
      userEmail: c4Creator.email,
      userName: c4Creator.name,
      replyCount: 0,
    },
  ]);
});
