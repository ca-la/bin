import * as uuid from 'node-uuid';
import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import * as AnnotationsDAO from './dao';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import { create as createDesignCanvas } from '../../dao/product-design-canvases';
import ResourceNotFoundError from '../../errors/resource-not-found';
import * as CommentsDAO from '../comments/dao';
import * as AnnotationCommentsDAO from '../annotation-comments/dao';

test('ProductDesignCanvasAnnotation DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
  const designCanvas = await createDesignCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });

  const result = await AnnotationsDAO.findById(designCanvasAnnotation.id);
  t.deepEqual(result, designCanvasAnnotation, 'Finds annotation by annotation ID');

  const asList = await AnnotationsDAO.findAllByCanvasId(designCanvas.id);
  t.deepEqual(asList, [designCanvasAnnotation], 'Finds annotation by canvas ID');
});

test('ProductDesignCanvasAnnotationsDAO#findAllWithCommentsByCanvasId', async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
  const designCanvas = await createDesignCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });
  const annotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });

  const withoutComment = await AnnotationsDAO
    .findAllWithCommentsByCanvasId(designCanvas.id);
  t.deepEqual(withoutComment, [], 'Does not return an annotation without any comments');

  const comment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: comment.id
  });

  const withComment = await AnnotationsDAO
    .findAllWithCommentsByCanvasId(designCanvas.id);
  t.deepEqual(withComment, [annotation], 'Returns annotations with comments');
});

test('ProductDesignCanvasAnnotation DAO supports updating', async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
  const designCanvas = await createDesignCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: designCanvasAnnotation.createdAt,
    createdBy: user.id,
    deletedAt: null,
    id: designCanvasAnnotation.id,
    x: 55,
    y: 22
  };
  const updated = await AnnotationsDAO.update(
    designCanvasAnnotation.id,
    data
  );
  t.deepEqual(
    updated,
    {
      ...designCanvasAnnotation,
      ...data
    },
    'Succesfully updated the annotation'
  );
});

test('ProductDesignCanvasAnnotation DAO supports deletion', async (t: tape.Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
  const designCanvas = await createDesignCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });
  const designCanvasAnnotation = await AnnotationsDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });

  const result = await AnnotationsDAO.deleteById(designCanvasAnnotation.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');
  const removed = await AnnotationsDAO.findById(designCanvasAnnotation.id);
  t.equal(removed, null, 'Succesfully removed from database');

  await AnnotationsDAO.deleteById(designCanvasAnnotation.id)
    .then(() => t.fail('Second delete should not succeed'))
    .catch((err: Error) => t.ok(
      err instanceof ResourceNotFoundError,
      'deleting a second time rejects with ResourceNotFoundError'
    ));
});
