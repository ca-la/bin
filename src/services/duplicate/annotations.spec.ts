import * as tape from 'tape';
import * as Knex from 'knex';

import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import generateAnnotation from '../../test-helpers/factories/product-design-canvas-annotation';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComment from '../../test-helpers/factories/comment';

import * as AnnotationCommentsDAO from '../../dao/product-design-canvas-annotation-comments';
import { findAndDuplicateAnnotations } from './annotations';

test('findAndDuplicateAnnotations', async (t: tape.Test) => {
  const { comment, createdBy } = await generateComment();
  const { annotation, canvas } = await generateAnnotation({ createdBy: createdBy.id });
  const { canvas: canvasTwo } = await generateCanvas({ createdBy: createdBy.id });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: comment.id
  });

  const duplicateAnnotations = await db.transaction(async (trx: Knex.Transaction) => {
    return await findAndDuplicateAnnotations(canvas.id, canvasTwo.id, trx);
  });

  t.equal(duplicateAnnotations.length, 1, 'Only one annotation was duplicated.');

  const a1 = duplicateAnnotations[0];
  t.deepEqual(
    a1,
    { ...annotation, id: a1.id, canvasId: canvasTwo.id, createdAt: a1.createdAt },
    'Returns the duplicate annotation'
  );
  const c1 = await AnnotationCommentsDAO.findByAnnotationId(a1.id);
  if (!c1) { throw new Error(`Comments for annotation ${a1.id} not found!`); }

  t.equal(c1.length, 1, 'The duplicated annotation has an associated comment');
  t.deepEqual(
    c1[0],
    { ...comment, id: c1[0].id, createdAt: c1[0].createdAt },
    'The duplicated comment is the same minus the id and createdAt fields'
  );
});
