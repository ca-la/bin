import Knex from "knex";
import db from "../services/db";
import { log, logClientError } from "../services/logger";

import * as CollectionsDAO from "../components/collections/dao";
import * as ProductDesignsDAO from "../components/product-designs/dao";
import * as TemplateDesignsDAO from "../components/templates/designs/dao";
import TemplateCategoriesDAO from "../components/templates/categories/dao";
import ProductDesign from "../components/product-designs/domain-objects/product-design";

function main() {
  const [collectionId, categoryId] = process.argv.slice(2);

  if (!collectionId || !categoryId) {
    throw new Error("You must provide a collection ID and a category ID");
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const collection = await CollectionsDAO.findById(collectionId, trx);
    if (!collection) {
      throw new Error(`Could not find collection with ID ${collectionId}`);
    }

    const category = await TemplateCategoriesDAO.findById(trx, categoryId);
    if (!category) {
      throw new Error(`Could not find category with ID ${categoryId}`);
    }

    log(`Category: ${JSON.stringify(category, null, 2)}`);

    const existingCategoryDesigns = await TemplateDesignsDAO.getAll(trx, {
      templateCategoryIds: [categoryId],
      limit: 1000,
      offset: 0,
    });

    if (existingCategoryDesigns.length > 0) {
      log(`Removing existing ${existingCategoryDesigns.length} templates`);
      await TemplateDesignsDAO.removeList(
        existingCategoryDesigns.map((d: ProductDesign) => d.id),
        trx
      );
    }

    const designs = await ProductDesignsDAO.findByCollectionId(
      collectionId,
      trx
    );
    if (designs.length === 0) {
      throw new Error(
        `Could not find designs for collection with ID ${collectionId}`
      );
    }

    const created = await TemplateDesignsDAO.createList(
      designs.map((d: ProductDesign) => ({
        designId: d.id,
        templateCategoryId: category.id,
      })),
      trx
    );

    log(`Successfully added designs: ${JSON.stringify(created, null, 2)}`);
  });
}

main()
  .catch((err: Error) => {
    logClientError(err.message);
    process.exit(1);
  })
  .then(() => process.exit(0));
