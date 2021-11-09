import Knex from "knex";
import { omit } from "lodash";

import * as CanvasesDAO from "../../components/canvases/dao";
import DesignsDAO = require("../../components/product-designs/dao");
import createDesign from "../create-design";

import Design = require("../../components/product-designs/domain-objects/product-design");
import prepareForDuplication from "./prepare-for-duplication";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { findAndDuplicateCanvas } from "./canvases";
import { findAndDuplicateVariants } from "./variants";

/**
 * Finds the given design and duplicates it. Does the same with all related sub-resources.
 * Design --> Canvases
 *        --> ProductDesignVariants
 */
export async function findAndDuplicateDesign(
  trx: Knex.Transaction,
  designId: string,
  newCreatorId: string,
  collectionIds?: string[]
): Promise<Design> {
  const design = await DesignsDAO.findById(designId, undefined, undefined, trx);
  if (!design) {
    throw new ResourceNotFoundError(`Design ${designId} not found`);
  }
  const duplicatedDesign = await createDesign(
    prepareForDuplication(
      omit(
        design,
        "collections",
        "imageAssets",
        "imageLinks",
        "approvalSteps",
        "progress",
        "firstStepCreatedAt",
        "lastStepDueAt"
      ),
      {
        userId: newCreatorId,
        collectionIds: collectionIds || [],
      }
    ),
    trx
  );

  const canvases = await CanvasesDAO.findAllByDesignId(designId);
  for (const canvas of canvases) {
    await findAndDuplicateCanvas(canvas.id, duplicatedDesign.id, trx);
  }

  await findAndDuplicateVariants(designId, duplicatedDesign.id, trx);

  const found = await DesignsDAO.findById(
    duplicatedDesign.id,
    undefined,
    undefined,
    trx
  );

  if (!found) {
    throw new ResourceNotFoundError(
      `Could not find design after duplication with id: ${duplicatedDesign.id}`
    );
  }

  return found;
}
