import * as Knex from 'knex';

import * as db from '../../../services/db';
import { findByDesignId } from '../designs/dao';
import findAndDuplicateTemplateDesign from '../../../services/duplicate/templates/designs';
import ProductDesign = require('../../product-designs/domain-objects/product-design');
import ResourceNotFoundError from '../../../errors/resource-not-found';

export default async function createFromDesignTemplate(
  templateDesignId: string,
  newCreatorId: string
): Promise<ProductDesign> {
  return db.transaction(
    async (trx: Knex.Transaction): Promise<ProductDesign> => {
      const result = await findByDesignId(templateDesignId, trx);
      if (!result) {
        throw new ResourceNotFoundError(
          `Template for design "${templateDesignId}" does not exist.`
        );
      }

      return findAndDuplicateTemplateDesign(result.designId, newCreatorId, trx);
    }
  );
}
