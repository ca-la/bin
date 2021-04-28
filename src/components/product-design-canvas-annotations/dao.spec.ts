import uuid from "node-uuid";
import tape from "tape";
import Knex from "knex";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import * as AnnotationsDAO from "./dao";
import createUser from "../../test-helpers/create-user";
import ResourceNotFoundError from "../../errors/resource-not-found";
import * as AnnotationCommentsDAO from "../annotation-comments/dao";
import * as CommentsDAO from "../comments/dao";
import generateComment from "../../test-helpers/factories/comment";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import createDesign from "../../services/create-design";

test("ProductDesignCanvasAnnotation DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
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
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10,
  });

  const result = await AnnotationsDAO.findById(designCanvasAnnotation.id);
  t.deepEqual(
    result,
    designCanvasAnnotation,
    "Finds annotation by annotation ID"
  );

  const asList = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllByCanvasId(trx, designCanvas.id)
  );
  t.deepEqual(
    asList,
    [designCanvasAnnotation],
    "Finds annotation by canvas ID"
  );
});

test("findAllByCanvasId returns in order of newest to oldest", async (t: tape.Test) => {
  const { annotation, canvas } = await generateAnnotation();
  const { annotation: annotationTwo } = await generateAnnotation({
    canvasId: canvas.id,
  });

  const result = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllByCanvasId(trx, canvas.id)
  );
  t.deepEqual(
    result,
    [annotationTwo, annotation],
    "Returns in the correct order"
  );
});

test("findAllWithCommentsByDesign with comments", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { annotation: a1, canvas, design } = await generateAnnotation({
    createdBy: user.id,
  });
  const { comment } = await generateComment({ userId: user.id });
  const { comment: commentTwo } = await generateComment({ userId: user.id });
  await AnnotationCommentsDAO.create({
    annotationId: a1.id,
    commentId: comment.id,
  });
  await AnnotationCommentsDAO.create({
    annotationId: a1.id,
    commentId: commentTwo.id,
  });

  const { annotation: a2 } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });
  const { comment: c3 } = await generateComment();
  await AnnotationCommentsDAO.create({ annotationId: a2.id, commentId: c3.id });

  const result = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllWithCommentsByDesign(trx, design.id)
  );
  t.deepEqual(
    result,
    [a2, a1],
    "Returns annotations with comments from newest to oldest"
  );
});

test("findAllWithCommentsByCanvasId with no comments", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
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
  await generateAnnotation({
    canvasId: designCanvas.id,
    createdBy: user.id,
  });

  const withoutComment = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllWithCommentsByCanvasId(trx, designCanvas.id)
  );
  t.deepEqual(
    withoutComment,
    [],
    "Does not return an annotation without any comments"
  );
});

test("findAllWithCommentsByCanvasId with comments", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { annotation: a1, canvas } = await generateAnnotation({
    createdBy: user.id,
  });
  const { comment } = await generateComment({ userId: user.id });
  const { comment: commentTwo } = await generateComment({ userId: user.id });
  await AnnotationCommentsDAO.create({
    annotationId: a1.id,
    commentId: comment.id,
  });
  await AnnotationCommentsDAO.create({
    annotationId: a1.id,
    commentId: commentTwo.id,
  });

  const { annotation: a2 } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });
  const { comment: c3 } = await generateComment();
  await AnnotationCommentsDAO.create({ annotationId: a2.id, commentId: c3.id });

  const result = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllWithCommentsByCanvasId(trx, canvas.id)
  );
  t.deepEqual(
    result,
    [a2, a1],
    "Returns annotations with comments from newest to oldest"
  );
});

test("findAllWithCommentsByCanvasId with deletions", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { annotation: a1, canvas } = await generateAnnotation({
    createdBy: user.id,
  });
  const { comment } = await generateComment({ userId: user.id });
  await AnnotationCommentsDAO.create({
    annotationId: a1.id,
    commentId: comment.id,
  });
  await CommentsDAO.deleteById(comment.id);

  const { annotation: a2 } = await generateAnnotation({
    canvasId: canvas.id,
    createdBy: user.id,
  });
  const { comment: c3 } = await generateComment();
  await AnnotationCommentsDAO.create({ annotationId: a2.id, commentId: c3.id });
  await AnnotationsDAO.deleteById(a2.id);

  const result = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.findAllWithCommentsByCanvasId(trx, canvas.id)
  );
  t.deepEqual(
    result,
    [],
    "Returns non-deleted annotations with non-deleted comments"
  );
});

test("ProductDesignCanvasAnnotation DAO supports updating", async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
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
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10,
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: designCanvasAnnotation.createdAt,
    createdBy: user.id,
    deletedAt: null,
    id: designCanvasAnnotation.id,
    x: 55,
    y: 22,
  };
  const updated = await AnnotationsDAO.update(designCanvasAnnotation.id, data);
  t.deepEqual(
    updated,
    {
      ...designCanvasAnnotation,
      ...data,
    },
    "Succesfully updated the annotation"
  );
});

test("ProductDesignCanvasAnnotation DAO supports deletion", async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
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
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10,
  });

  const result = await AnnotationsDAO.deleteById(designCanvasAnnotation.id);
  t.notEqual(result.deletedAt, null, "Successfully deleted one row");
  const removed = await AnnotationsDAO.findById(designCanvasAnnotation.id);
  t.equal(removed, null, "Succesfully removed from database");

  await AnnotationsDAO.deleteById(designCanvasAnnotation.id)
    .then(() => t.fail("Second delete should not succeed"))
    .catch((err: Error) =>
      t.ok(
        err instanceof ResourceNotFoundError,
        "deleting a second time rejects with ResourceNotFoundError"
      )
    );
});
