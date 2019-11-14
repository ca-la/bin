import uuid from 'node-uuid';
import Canvas from '../../components/canvases/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import * as CanvasesDAO from '../../components/canvases/dao';
import Annotation from '../../components/product-design-canvas-annotations/domain-object';
import { create } from '../../components/product-design-canvas-annotations/dao';
import generateCanvas from './product-design-canvas';
import User from '../../components/users/domain-object';

interface AnnotationWithResources {
  annotation: Annotation;
  canvas: Canvas;
  createdBy: User;
}

export default async function generateAnnotation(
  options: Partial<Annotation> = {}
): Promise<AnnotationWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const { canvas } = options.canvasId
    ? { canvas: await CanvasesDAO.findById(options.canvasId) }
    : await generateCanvas({ createdBy: user.id });

  if (!canvas) {
    throw new Error('Canvas was unable to be found or created!');
  }

  const annotation = await create({
    canvasId: canvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: options.id || uuid.v4(),
    x: options.x || 0,
    y: options.y || 0
  });

  return {
    annotation,
    canvas,
    createdBy: user
  };
}
