import * as Knex from 'knex';

import * as ComponentsDAO from '../../dao/components';
import * as CanvasesDAO from '../../dao/product-design-canvases';

import Component from '../../domain-objects/component';
import Canvas from '../../domain-objects/product-design-canvas';

import { findAndDuplicateComponent } from './components';
import prepareForDuplication from './prepare-for-duplication';
import { findAndDuplicateMeasurements } from './measurements';
import { findAndDuplicateAnnotations } from './annotations';

/**
 * Finds the given canvas and duplicates it. Does the same with all related components.
 * Duplication Tree:
 * Canvas --> Components --> Options; (images maintain the same record).
 *        --> Measurements.
 *        --> Annotations --> AnnotationComments --> Comments.
 */
export async function findAndDuplicateCanvas(
  canvasId: string,
  newDesignId: string,
  trx: Knex.Transaction
): Promise<Canvas> {
  const canvas = await CanvasesDAO.findById(canvasId);
  if (!canvas) { throw new Error(`Could not find canvas ${canvasId}!`); }

  // Duplicate: Components --> Options; (images maintain same record).
  const components = await ComponentsDAO.findAllByCanvasId(canvasId);
  let rootComponentId: string | null = null;
  await Promise.all(components.map(async (component: Component): Promise<void> => {
    // TODO: how would you guarantee that the parent/child relationships maintain??
    const newComponent = await findAndDuplicateComponent(component.id, component.parentId, trx);

    if (component.id === canvas.componentId) {
      rootComponentId = newComponent.id;
    }
  }));

  // Duplicate: Canvas
  const duplicateCanvas = await CanvasesDAO.create(
    prepareForDuplication(canvas, { componentId: rootComponentId, designId: newDesignId }),
    trx
  );

  // Duplicate Annotations, Measurements.
  await Promise.all([
    findAndDuplicateMeasurements(canvasId, duplicateCanvas.id, trx),
    findAndDuplicateAnnotations(canvasId, duplicateCanvas.id, trx)
  ]);

  return duplicateCanvas;
}