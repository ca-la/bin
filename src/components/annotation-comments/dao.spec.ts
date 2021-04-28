import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import { create as createAnnotation } from "../product-design-canvas-annotations/dao";
import {
  create as createComment,
  deleteById as deleteComment,
} from "../comments/dao";
import { create, findByAnnotationId, findByAnnotationIds } from "./dao";
import createUser from "../../test-helpers/create-user";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateComment from "../../test-helpers/factories/comment";
import db from "../../services/db";
import createDesign from "../../services/create-design";

test("ProductDesignCanvasAnnotationComment DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

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
  const annotation = await createAnnotation({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10,
  });
  const comment1 = await createComment({
    createdAt: now,
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  const comment2 = await createComment({
    createdAt: yesterday,
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  await create({
    annotationId: annotation.id,
    commentId: comment1.id,
  });
  await create({
    annotationId: annotation.id,
    commentId: comment2.id,
  });

  const result = await findByAnnotationId(annotation.id);
  t.deepEqual(
    result,
    [
      {
        ...comment2,
        annotationId: annotation.id,
      },
      {
        ...comment1,
        annotationId: annotation.id,
      },
    ],
    "Finds comments by annotation"
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
  const { comment: c2, createdBy: c2Creator } = await generateComment();
  const { comment: c3, createdBy: c3Creator } = await generateComment();
  const { comment: c4, createdBy: c4Creator } = await generateComment();

  await create({ annotationId: annotationOne.id, commentId: c1.id });
  await create({ annotationId: annotationOne.id, commentId: c2.id });
  await create({ annotationId: annotationOne.id, commentId: c3.id });
  await create({ annotationId: annotationTwo.id, commentId: c4.id });

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
    },
    {
      ...c2,
      mentions: {},
      userEmail: c2Creator.email,
      userName: c2Creator.name,
    },
    {
      ...c3,
      mentions: {},
      userEmail: c3Creator.email,
      userName: c3Creator.name,
    },
  ]);
  t.deepEqual(result[annotationTwo.id], [
    {
      ...c4,
      mentions: {},
      userEmail: c4Creator.email,
      userName: c4Creator.name,
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
    },
    {
      ...c3,
      mentions: {},
      userEmail: c3Creator.email,
      userName: c3Creator.name,
    },
  ]);
});
