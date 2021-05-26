import tape from "tape";
import Knex from "knex";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateComment from "../../test-helpers/factories/comment";

import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import { findAndDuplicateAnnotations } from "./annotations";

test("findAndDuplicateAnnotations", async (t: tape.Test) => {
  const { comment, createdBy } = await generateComment();
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

  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: comment.id,
  });

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
  const c1 = await AnnotationCommentsDAO.findByAnnotationId(db, {
    annotationId: a1.id,
  });
  if (!c1) {
    throw new Error(`Comments for annotation ${a1.id} not found!`);
  }

  t.equal(c1.length, 1, "The duplicated annotation has an associated comment");
  t.deepEqual(
    c1[0],
    {
      ...comment,
      annotationId: a1.id,
      createdAt: c1[0].createdAt,
      id: c1[0].id,
      replyCount: 0,
    },
    "The duplicated comment is the same minus the id and createdAt fields"
  );
});
