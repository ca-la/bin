import Knex from "knex";

import db from "../../../services/db";
import { findByDesignId } from "../designs/dao";
import findAndDuplicateTemplateDesign from "../../../services/duplicate/templates/designs";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import ResourceNotFoundError from "../../../errors/resource-not-found";
import { findAndDuplicateDesign } from "../../../services/duplicate/designs";

/**
 * Creates a new design from a template design. Depending on if this is
 * marked for Phidias, it will either create preview tool data or phidias data.
 */
export default async function createFromDesignTemplate(options: {
  isPhidias?: boolean;
  templateDesignId: string;
  newCreatorId: string;
}): Promise<ProductDesign> {
  const { isPhidias, newCreatorId, templateDesignId } = options;

  return db.transaction(
    async (trx: Knex.Transaction): Promise<ProductDesign> => {
      const result = await findByDesignId(templateDesignId, trx);

      if (!result) {
        throw new ResourceNotFoundError(
          `Template for design "${templateDesignId}" does not exist.`
        );
      }

      if (isPhidias) {
        return await findAndDuplicateTemplateDesign(
          result.designId,
          newCreatorId,
          trx
        );
      }

      return await findAndDuplicateDesign(templateDesignId, newCreatorId, trx);
    }
  );
}
