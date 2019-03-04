import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create as createAnnotation } from '../../components/product-design-canvas-annotations/dao';
import { create as createComment } from '../../components/comments/dao';
import { create, findByAnnotationId } from './index';
import { create as createDesign } from '../product-designs';
import { create as createDesignCanvas } from '../product-design-canvases';
import createUser = require('../../test-helpers/create-user');

test(
  'ProductDesignCanvasAnnotationComment DAO supports creation/retrieval',
  async (t: tape.Test) => {
    const { user } = await createUser({ withSession: false });
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

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
    const annotation = await createAnnotation({
      canvasId: designCanvas.id,
      createdBy: user.id,
      deletedAt: null,
      id: uuid.v4(),
      x: 20,
      y: 10
    });
    const comment1 = await createComment({
      createdAt: now,
      deletedAt: null,
      id: uuid.v4(),
      isPinned: false,
      parentCommentId: null,
      text: 'A comment',
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    });
    const comment2 = await createComment({
      createdAt: yesterday,
      deletedAt: null,
      id: uuid.v4(),
      isPinned: false,
      parentCommentId: null,
      text: 'A comment',
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    });
    await create({
      annotationId: annotation.id,
      commentId: comment1.id
    });
    await create({
      annotationId: annotation.id,
      commentId: comment2.id
    });

    const result = await findByAnnotationId(annotation.id);
    t.deepEqual(result, [comment2, comment1], 'Finds comments by annotation');
  }
);
