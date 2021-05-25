import Knex from "knex";

import { findByDesignId } from "../designs/dao";
import findAndDuplicateTemplateDesign from "../../../services/duplicate/templates/designs";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import ResourceNotFoundError from "../../../errors/resource-not-found";
import { findAndDuplicateDesign } from "../../../services/duplicate/designs";

/**
 * Creates a new design from a template design. Depending on if this is
 * marked for Phidias, it will either create preview tool data or phidias data.
 */
export default async function createFromDesignTemplate(
  trx: Knex.Transaction,
  options: {
    isPhidias?: boolean;
    templateDesignId: string;
    newCreatorId: string;
    collectionId: string | null;
  }
): Promise<ProductDesign> {
  const { isPhidias, newCreatorId, templateDesignId, collectionId } = options;

  const result = await findByDesignId(templateDesignId, trx);

  if (!result) {
    throw new ResourceNotFoundError(
      `Template for design "${templateDesignId}" does not exist.`
    );
  }

  if (isPhidias) {
    return await findAndDuplicateTemplateDesign(
      trx,
      result.designId,
      newCreatorId,
      collectionId ? [collectionId] : undefined
    );
  }

  return await findAndDuplicateDesign(
    trx,
    templateDesignId,
    newCreatorId,
    collectionId ? [collectionId] : undefined
  );
}
