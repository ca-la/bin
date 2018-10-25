import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create as createAnnotation } from '../product-design-canvas-annotations';
import { create as createComment } from '../comments';
import { create, findByAnnotationId } from './index';
import { create as createDesign } from '../product-designs';
import { create as createDesignCanvas } from '../product-design-canvases';
import createUser = require('../../test-helpers/create-user');

test(
  'ProductDesignCanvasAnnotationComment DAO supports creation/retrieval',
  async (t: tape.Test) => {
    const { user } = await createUser({ withSession: false });

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
      title: 'My Green Tee',
      width: 200,
      x: 0,
      y: 0
    });
    const annotation = await createAnnotation({
      canvasId: designCanvas.id,
      createdBy: user.id,
      deletedAt: null,
      id: uuid.v4(),
      x: 20,
      y: 10
    });
    const comment = await createComment({
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      isPinned: false,
      parentCommentId: null,
      text: 'A comment',
      userId: user.id
    });
    await create({
      annotationId: annotation.id,
      commentId: comment.id
    });

    const result = await findByAnnotationId(annotation.id);
    t.deepEqual(result, [comment], 'Finds comments by annotation');
  }
);
