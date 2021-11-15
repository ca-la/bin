import tape from "tape";
import Knex from "knex";
import { omit } from "lodash";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateComment from "../../test-helpers/factories/comment";

import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import { findAndDuplicateAnnotations } from "./annotations";

test("findAndDuplicateAnnotations", async (t: tape.Test) => {
  const { comment: comment1, createdBy } = await generateComment({
    text: "Comment 1",
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment2Thread } = await generateComment({
    text: "Comment 2",
    createdAt: new Date(2019, 10, 2),
  });
  const { comment: comment3ReplyTo2 } = await generateComment({
    text: "Comment 3",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 3),
  });
  const { comment: comment4ReplyTo2 } = await generateComment({
    text: "Comment 4",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 4),
  });
  const { comment: comment5 } = await generateComment({
    text: "Comment 5",
    createdAt: new Date(2019, 10, 5),
  });
  const { comment: comment6ReplyTo2 } = await generateComment({
    text: "Comment 6",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 6),
  });
  const { comment: comment7ThreadDeletedParent } = await generateComment({
    text: "Comment 7",
    createdAt: new Date(2019, 10, 7),
    deletedAt: new Date(2019, 10, 7),
  });
  const { comment: comment8ReplyTo7 } = await generateComment({
    text: "Comment 8",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 8),
  });
  const { comment: comment9ReplyTo7 } = await generateComment({
    text: "Comment 9",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 9),
  });
  const { comment: comment10ReplyTo7Deleted } = await generateComment({
    text: "Comment 10",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 10),
    deletedAt: new Date(2019, 10, 11),
  });
  const { comment: comment11Deleted } = await generateComment({
    text: "Comment 11",
    createdAt: new Date(2019, 10, 11),
    deletedAt: new Date(2019, 10, 12),
  });

  const { annotation, canvas } = await generateAnnotation({
    createdBy: createdBy.id,
  });
  const { canvas: canvasTwo, design } = await generateCanvas({
    createdBy: createdBy.id,
  });
  const col1 = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    createdBy.id
  );

  if (!col1) {
    throw new Error("Collaborator could not be found.");
  }

  const annotationComments = [
    comment1,
    comment2Thread,
    comment3ReplyTo2,
    comment4ReplyTo2,
    comment5,
    comment6ReplyTo2,
    comment7ThreadDeletedParent,
    comment8ReplyTo7,
    comment9ReplyTo7,
    comment10ReplyTo7Deleted,
    comment11Deleted,
  ];
  for (const comment of annotationComments) {
    await AnnotationCommentsDAO.create({
      annotationId: annotation.id,
      commentId: comment.id,
    });
  }

  const duplicateAnnotations = await db.transaction(
    async (trx: Knex.Transaction) => {
      return await findAndDuplicateAnnotations(canvas.id, canvasTwo.id, trx);
    }
  );

  t.equal(
    duplicateAnnotations.length,
    1,
    "Only one annotation was duplicated."
  );

  const a1 = duplicateAnnotations[0];
  t.deepEqual(
    a1,
    {
      ...annotation,
      id: a1.id,
      canvasId: canvasTwo.id,
      createdAt: a1.createdAt,
    },
    "Returns the duplicate annotation"
  );

  const originalAnnotationComments = await AnnotationCommentsDAO.findByAnnotationId(
    db,
    { annotationId: annotation.id }
  );
  const duplicatedAnnotationComments = await AnnotationCommentsDAO.findByAnnotationId(
    db,
    {
      annotationId: a1.id,
    }
  );

  t.equal(
    duplicatedAnnotationComments.length,
    9,
    "The duplicated annotation has associated comments"
  );

  for (let commentIndex = 0; commentIndex < 9; commentIndex += 1) {
    t.deepEqual(
      omit(
        duplicatedAnnotationComments[commentIndex],
        "id",
        "parentCommentId",
        "annotationId"
      ),
      omit(
        originalAnnotationComments[commentIndex],
        "id",
        "parentCommentId",
        "annotationId"
      ),
      `[${
        commentIndex + 1
      }]: original comment and duplicated comments order and content are identical`
    );
  }

  const duplicated2Thread = duplicatedAnnotationComments[1];
  const duplicated3ReplyTo2 = duplicatedAnnotationComments[2];
  const duplicated4ReplyTo2 = duplicatedAnnotationComments[3];
  t.equal(
    duplicated3ReplyTo2.parentCommentId,
    duplicated2Thread.id,
    "duplicated comment 3 is a reply to duplicated comment 2"
  );
  t.equal(
    duplicated4ReplyTo2.parentCommentId,
    duplicated2Thread.id,
    "duplicated comment 4 is a reply to duplicated comment 2"
  );

  const duplicated7ThreadDeletedParent = duplicatedAnnotationComments[6];
  const duplicated8ReplyTo7 = duplicatedAnnotationComments[7];
  const duplicated9ReplyTo7 = duplicatedAnnotationComments[8];
  t.equal(
    duplicated8ReplyTo7.parentCommentId,
    duplicated7ThreadDeletedParent.id,
    "duplicated comment 8 is a reply to duplicated deleted comment 7"
  );
  t.equal(
    duplicated9ReplyTo7.parentCommentId,
    duplicated7ThreadDeletedParent.id,
    "duplicated comment 9 is a reply to duplicated deleted comment 7"
  );
});

test("findAndDuplicateAnnotations: all the same created at date", async (t: tape.Test) => {
  const { comment: comment1, createdBy } = await generateComment({
    text: "Comment 1",
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment2Thread } = await generateComment({
    text: "Comment 2",
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment3ReplyTo2 } = await generateComment({
    text: "Comment 3",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment4ReplyTo2 } = await generateComment({
    text: "Comment 4",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment5 } = await generateComment({
    text: "Comment 5",
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment6ReplyTo2 } = await generateComment({
    text: "Comment 6",
    parentCommentId: comment2Thread.id,
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment7ThreadDeletedParent } = await generateComment({
    text: "Comment 7",
    createdAt: new Date(2019, 10, 1),
    deletedAt: new Date(2019, 10, 1),
  });
  const { comment: comment8ReplyTo7 } = await generateComment({
    text: "Comment 8",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment9ReplyTo7 } = await generateComment({
    text: "Comment 9",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 1),
  });
  const { comment: comment10ReplyTo7Deleted } = await generateComment({
    text: "Comment 10",
    parentCommentId: comment7ThreadDeletedParent.id,
    createdAt: new Date(2019, 10, 1),
    deletedAt: new Date(2019, 10, 1),
  });
  const { comment: comment11Deleted } = await generateComment({
    text: "Comment 11",
    createdAt: new Date(2019, 10, 1),
    deletedAt: new Date(2019, 10, 1),
  });

  const { annotation, canvas } = await generateAnnotation({
    createdBy: createdBy.id,
  });
  const { canvas: canvasTwo, design } = await generateCanvas({
    createdBy: createdBy.id,
  });
  const col1 = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    createdBy.id
  );

  if (!col1) {
    throw new Error("Collaborator could not be found.");
  }

  const annotationComments = [
    comment1,
    comment2Thread,
    comment3ReplyTo2,
    comment4ReplyTo2,
    comment5,
    comment6ReplyTo2,
    comment7ThreadDeletedParent,
    comment8ReplyTo7,
    comment9ReplyTo7,
    comment10ReplyTo7Deleted,
    comment11Deleted,
  ];
  for (const comment of annotationComments) {
    await AnnotationCommentsDAO.create({
      annotationId: annotation.id,
      commentId: comment.id,
    });
  }

  const duplicateAnnotations = await db.transaction(
    async (trx: Knex.Transaction) => {
      return await findAndDuplicateAnnotations(canvas.id, canvasTwo.id, trx);
    }
  );

  t.equal(
    duplicateAnnotations.length,
    1,
    "Only one annotation was duplicated."
  );

  const a1 = duplicateAnnotations[0];
  t.deepEqual(
    a1,
    {
      ...annotation,
      id: a1.id,
      canvasId: canvasTwo.id,
      createdAt: a1.createdAt,
    },
    "Returns the duplicate annotation"
  );

  const originalAnnotationComments = await AnnotationCommentsDAO.findByAnnotationId(
    db,
    { annotationId: annotation.id }
  );
  const duplicatedAnnotationComments = await AnnotationCommentsDAO.findByAnnotationId(
    db,
    {
      annotationId: a1.id,
    }
  );

  t.equal(
    duplicatedAnnotationComments.length,
    originalAnnotationComments.length,
    "All comments were duplicated"
  );
});
