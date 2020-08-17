import Knex from "knex";
import rethrow from "pg-rethrow";

import {
  dataAdapter,
  isTemplateDesignRow,
  TemplateDesign,
  TemplateDesignRow,
} from "./domain-object";
import db from "../../../services/db";
import { validate, validateEvery } from "../../../services/validate-from-db";
import filterError = require("../../../services/filter-error");
import InvalidDataError = require("../../../errors/invalid-data");
import { queryWithCollectionMeta } from "../../product-designs/dao/view";
import ProductDesign = require("../../product-designs/domain-objects/product-design");

const TABLE_NAME = "template_designs";

function onNoDesignError(designId: string): typeof filterError {
  return filterError(
    rethrow.ERRORS.ForeignKeyViolation,
    (error: typeof rethrow.ERRORS.ForeignKeyViolation) => {
      if (error.constraint === "template_designs_design_id_fkey") {
        throw new InvalidDataError(`Design ${designId} does not exist.`);
      }

      throw error;
    }
  );
}

export async function createList(
  dataList: TemplateDesign[],
  trx: Knex.Transaction
): Promise<TemplateDesign[]> {
  const insertionData = dataList.map((data: TemplateDesign) =>
    dataAdapter.forInsertion(data)
  );
  const createdRows = await db(TABLE_NAME)
    .insert(insertionData, "*")
    .transacting(trx)
    .catch(rethrow);

  return validateEvery<TemplateDesignRow, TemplateDesign>(
    TABLE_NAME,
    isTemplateDesignRow,
    dataAdapter,
    createdRows
  );
}

export async function removeList(
  designIds: string[],
  trx: Knex.Transaction
): Promise<number> {
  return db(TABLE_NAME)
    .whereIn("design_id", designIds)
    .delete()
    .transacting(trx);
}

export async function remove(
  designId: string,
  trx: Knex.Transaction
): Promise<void> {
  const count: number = await db(TABLE_NAME)
    .where({ design_id: designId })
    .delete()
    .transacting(trx);

  if (count === 0) {
    throw new InvalidDataError(`Template for design ${designId} not found.`);
  }
}

export async function findByDesignId(
  designId: string,
  trx?: Knex.Transaction
): Promise<TemplateDesign | null> {
  const templates = await db(TABLE_NAME)
    .select("*")
    .where({ design_id: designId })
    .limit(1)
    .modify((query: Knex.QueryBuilder): void => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .catch(onNoDesignError(designId));

  if (templates.length === 0) {
    return null;
  }

  return validate<TemplateDesignRow, TemplateDesign>(
    TABLE_NAME,
    isTemplateDesignRow,
    dataAdapter,
    templates[0]
  );
}

interface ListOptions {
  limit: number;
  offset: number;
}

export async function getAll(
  trx: Knex.Transaction,
  options: ListOptions
): Promise<ProductDesign[]> {
  return db(TABLE_NAME)
    .select("product_designs.*")
    .innerJoin(
      queryWithCollectionMeta(db).as("product_designs"),
      "product_designs.id",
      "template_designs.design_id"
    )
    .limit(options.limit)
    .offset(options.offset)
    .orderBy("product_designs.created_at", "DESC")
    .transacting(trx)
    .then((rows: any): ProductDesign[] =>
      rows.map((row: any) => new ProductDesign(row))
    );
}
