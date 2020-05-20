import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import Canvas, {
  CanvasRow,
  dataAdapter,
  isCanvasRow,
  partialDataAdapter,
} from "./domain-object";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";
import {
  creatorDataAdapter,
  CreatorMetadata,
  CreatorMetadataRow,
  isCreatorMetadataRow,
} from "./domain-object/creator-metadata";

const TABLE_NAME = "canvases";

export class CanvasNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "CanvasNotFoundError";
  }
}

export async function create(
  data: MaybeUnsaved<Canvas>,
  trx?: Knex.Transaction
): Promise<Canvas> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null,
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CanvasRow[]) => first<CanvasRow>(rows));

  if (!created) {
    throw new Error("Failed to create rows");
  }

  return validate<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    created
  );
}

export async function update(
  id: string,
  data: Unsaved<Canvas>
): Promise<Canvas> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id,
  });
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, "*")
    .then((rows: CanvasRow[]) => first<CanvasRow>(rows));

  if (!updated) {
    throw new CanvasNotFoundError("Can't update canvas; canvas not found");
  }

  return validate<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    updated
  );
}

export interface ReorderRequest {
  id: string;
  ordering: number;
}

export async function reorder(data: ReorderRequest[]): Promise<Canvas[]> {
  let updated: CanvasRow[] = [];
  await db.transaction(async (trx: Knex.Transaction) => {
    updated = await Promise.all(
      data.map(async (reorderReq: ReorderRequest) => {
        const { id, ordering } = reorderReq;
        const rowData = partialDataAdapter.forInsertion({
          ordering,
        });
        const row = await db(TABLE_NAME)
          .update(rowData, "*")
          .where({ id })
          .transacting(trx)
          .then((rows: CanvasRow[]) => first<CanvasRow>(rows));
        if (!row) {
          throw new Error("Row could not be updated");
        }
        return row;
      })
    );
  });

  return validateEvery<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    updated
  );
}

export async function del(trx: Knex.Transaction, id: string): Promise<Canvas> {
  const deleted = await trx(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, "*")
    .then((rows: CanvasRow[]) => first<CanvasRow>(rows));

  if (!deleted) {
    throw new CanvasNotFoundError("Can't delete canvas; canvas not found");
  }

  return validate<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    deleted
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<Canvas | null> {
  const canvas = await db(TABLE_NAME)
    .select("*")
    .where({ id, deleted_at: null })
    .limit(1)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CanvasRow[]) => first<CanvasRow>(rows));

  if (!canvas) {
    return null;
  }

  return validate<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    canvas
  );
}

export async function findAllByDesignId(id: string): Promise<Canvas[]> {
  const canvases: CanvasRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ design_id: id, deleted_at: null })
    .orderBy("ordering");

  return validateEvery<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    canvases
  );
}

export async function findByComponentId(
  componentId: string
): Promise<Canvas | null> {
  const canvas = await db(TABLE_NAME)
    .select("*")
    .where({ component_id: componentId, deleted_at: null })
    .limit(1)
    .then((rows: CanvasRow[]) => first<CanvasRow>(rows));

  if (!canvas) {
    return null;
  }

  return validate<CanvasRow, Canvas>(
    TABLE_NAME,
    isCanvasRow,
    dataAdapter,
    canvas
  );
}

export async function getCreatorMetadata(
  canvasId: string
): Promise<CreatorMetadata | null> {
  const creatorRow = await db(TABLE_NAME)
    .select(
      "users.name AS created_by_name",
      "canvases.created_at AS created_at",
      "canvases.id AS canvas_id"
    )
    .leftJoin("users", "users.id", "canvases.created_by")
    .where({ "canvases.id": canvasId })
    .then((rows: CreatorMetadataRow[]) => {
      return first<CreatorMetadataRow>(rows);
    });

  if (!creatorRow) {
    return null;
  }

  return validate<CreatorMetadataRow, CreatorMetadata>(
    TABLE_NAME,
    isCreatorMetadataRow,
    creatorDataAdapter,
    creatorRow
  );
}
