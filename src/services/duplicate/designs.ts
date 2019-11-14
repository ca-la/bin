import Knex from 'knex';
import { omit } from 'lodash';

import * as CanvasesDAO from '../../components/canvases/dao';
import DesignsDAO = require('../../components/product-designs/dao');
import createDesign from '../create-design';

import Canvas from '../../components/canvases/domain-object';
import Design = require('../../components/product-designs/domain-objects/product-design');
import prepareForDuplication from './prepare-for-duplication';
import ResourceNotFoundError from '../../errors/resource-not-found';
import { findAndDuplicateCanvas } from './canvases';
import { findAndDuplicateVariants } from './variants';

/**
 * Finds the given design and duplicates it. Does the same with all related sub-resources.
 * Design --> Canvases
 *        --> ProductDesignVariants
 */
export async function findAndDuplicateDesign(
  designId: string,
  newCreatorId: string,
  trx: Knex.Transaction
): Promise<Design> {
  const design = await DesignsDAO.findById(designId);
  if (!design) {
    throw new ResourceNotFoundError(`Design ${designId} not found`);
  }
  const duplicatedDesign = await createDesign(
    prepareForDuplication(
      omit(design, 'collections', 'collectionIds', 'imageIds', 'imageLinks'),
      { userId: newCreatorId }
    ),
    trx
  );

  const canvases = await CanvasesDAO.findAllByDesignId(designId);
  await Promise.all(
    canvases.map(
      async (canvas: Canvas): Promise<void> => {
        await findAndDuplicateCanvas(canvas.id, duplicatedDesign.id, trx);
      }
    )
  );

  await findAndDuplicateVariants(designId, duplicatedDesign.id, trx);

  return duplicatedDesign;
}
