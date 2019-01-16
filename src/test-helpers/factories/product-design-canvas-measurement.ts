import * as uuid from 'node-uuid';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');
import * as CanvasesDAO from '../../dao/product-design-canvases';
import Measurement from '../../domain-objects/product-design-canvas-measurement';
import { create } from '../../dao/product-design-canvas-measurements';
import generateCanvas from './product-design-canvas';

interface MeasurementWithResources {
  measurement: Measurement;
  canvas: ProductDesignCanvas;
  createdBy: any;
}

export default async function generateMeasurement(
  options: Partial<Measurement> = {}
): Promise<MeasurementWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const { canvas } = options.canvasId
    ? { canvas: await CanvasesDAO.findById(options.canvasId) }
    : await generateCanvas({ createdBy: user.id });

  if (!canvas) { throw new Error('Canvas was unable to be found or created!'); }

  const measurement = await create({
    canvasId: canvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: options.endingX || 0,
    endingY: options.endingY || 0,
    id: options.id || uuid.v4(),
    label: options.label || 'A',
    measurement: options.measurement || '0',
    name: options.name || null,
    startingX: options.startingX || 0,
    startingY: options.startingY || 0
  });

  return {
    canvas,
    createdBy: user,
    measurement
  };
}
