import * as Knex from 'knex';

import * as DesignsDAO from '../../product-designs/dao';
import { createList } from '../designs/dao';

import ProductDesign = require('../../product-designs/domain-objects/product-design');
import ResourceNotFoundError from '../../../errors/resource-not-found';
import { TemplateDesign } from '../designs/domain-object';
import db = require('../../../services/db');

/**
 * Given a list of designIds, marks each design as a template.
 */
export async function createDesignTemplates(
  designIds: string[]
): Promise<ProductDesign[]> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const templateDesigns = designIds.map(
      (designId: string): TemplateDesign => {
        return {
          designId
        };
      }
    );

    await createList(templateDesigns, trx);

    const designs = await DesignsDAO.findByIds(designIds);

    if (designs.length !== designIds.length) {
      throw new ResourceNotFoundError(
        `Could not find all designs in list: ${designIds}`
      );
    }

    return designs;
  });
}
