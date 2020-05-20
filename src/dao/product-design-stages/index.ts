import Knex from "knex";
import uuid from "node-uuid";
import { QueryResult } from "pg";

import db from "../../services/db";
import ProductDesignStage, {
  dataAdapter,
  isDesignStageRow,
  ProductDesignStageRow,
} from "../../domain-objects/product-design-stage";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "product_design_stages";

export async function create(
  data: Unsaved<ProductDesignStage>,
  trx?: Knex.Transaction
): Promise<ProductDesignStage> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4(),
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ProductDesignStageRow[]) =>
      first<ProductDesignStageRow>(rows)
    );

  if (!created) {
    throw new Error("Failed to create rows");
  }

  return validate<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    created
  );
}

export async function createAll(
  data: Unsaved<ProductDesignStage>[],
  trx?: Knex.Transaction
): Promise<ProductDesignStage[]> {
  if (data.length === 0) {
    return [];
  }

  const rowData = data.map((datum: Unsaved<ProductDesignStage>) =>
    dataAdapter.forInsertion({
      ...datum,
      id: uuid.v4(),
    })
  );
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    created
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<ProductDesignStage | null> {
  const stages: ProductDesignStageRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ id })
    .orderBy("created_at", "asc")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .limit(1);

  const stage = stages[0];
  if (!stage) {
    return null;
  }

  return validate<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    stage
  );
}

export async function findAllByDesignId(
  designId: string
): Promise<ProductDesignStage[]> {
  const stages: ProductDesignStageRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ design_id: designId })
    .orderBy("ordering", "asc");

  return validateEvery<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    stages
  );
}

interface OrderedTitle {
  title: string;
  ordering: number;
}

export async function findAllTitles(): Promise<string[]> {
  return db
    .raw(
      `
SELECT * FROM (
  SELECT DISTINCT ON (title) title, ordering FROM product_design_stages
) AS stages
ORDER BY ordering;
`
    )
    .then((result: QueryResult) =>
      (result.rows as OrderedTitle[]).map((row: OrderedTitle) => row.title)
    );
}
