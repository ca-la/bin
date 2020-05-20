import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import ProductDesignStageTask, {
  dataAdapter,
  isDesignStageTaskRow,
  ProductDesignStageTaskRow,
} from "../../domain-objects/product-design-stage-task";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "product_design_stage_tasks";

export async function create(
  data: Unsaved<ProductDesignStageTask>,
  trx?: Knex.Transaction
): Promise<ProductDesignStageTask> {
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
    .then((rows: ProductDesignStageTaskRow[]) =>
      first<ProductDesignStageTaskRow>(rows)
    );

  if (!created) {
    throw new Error("Failed to create rows");
  }

  return validate<ProductDesignStageTaskRow, ProductDesignStageTask>(
    TABLE_NAME,
    isDesignStageTaskRow,
    dataAdapter,
    created
  );
}

export async function createAll(
  data: Unsaved<ProductDesignStageTask>[],
  trx?: Knex.Transaction
): Promise<ProductDesignStageTask[]> {
  if (data.length === 0) {
    return [];
  }

  const rowData = data.map((stageData: Unsaved<ProductDesignStageTask>) =>
    dataAdapter.forInsertion({
      ...stageData,
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

  return validateEvery<ProductDesignStageTaskRow, ProductDesignStageTask>(
    TABLE_NAME,
    isDesignStageTaskRow,
    dataAdapter,
    created
  );
}

export async function findById(
  id: string
): Promise<ProductDesignStageTask | null> {
  const stageTasks: ProductDesignStageTaskRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ id })
    .limit(1);

  const stageTask = stageTasks[0];

  if (!stageTask) {
    return null;
  }

  return validate<ProductDesignStageTaskRow, ProductDesignStageTask>(
    TABLE_NAME,
    isDesignStageTaskRow,
    dataAdapter,
    stageTask
  );
}

export async function findByTaskId(
  taskId: string,
  trx?: Knex.Transaction
): Promise<ProductDesignStageTask | null> {
  const stageTasks: ProductDesignStageTaskRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ task_id: taskId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .limit(1);

  const stageTask = stageTasks[0];

  if (!stageTask) {
    return null;
  }

  return validate<ProductDesignStageTaskRow, ProductDesignStageTask>(
    TABLE_NAME,
    isDesignStageTaskRow,
    dataAdapter,
    stageTask
  );
}

export async function findAllByDesignId(
  designId: string
): Promise<ProductDesignStageTask[]> {
  const stageTasks: ProductDesignStageTaskRow[] = await db(TABLE_NAME)
    .select("product_design_stage_tasks.*")
    .from(TABLE_NAME)
    .leftJoin(
      "product_design_stages",
      "product_design_stages.id",
      "product_design_stage_tasks.design_stage_id"
    )
    .where({ "product_design_stages.design_id": designId })
    .orderBy("created_at", "desc");

  return validateEvery<ProductDesignStageTaskRow, ProductDesignStageTask>(
    TABLE_NAME,
    isDesignStageTaskRow,
    dataAdapter,
    stageTasks
  );
}
