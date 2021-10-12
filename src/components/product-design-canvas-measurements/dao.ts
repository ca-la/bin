import rethrow = require("pg-rethrow");
import Knex from "knex";

import db from "../../services/db";
import filterError = require("../../services/filter-error");
import InvalidDataError = require("../../errors/invalid-data");
import { pick } from "lodash";
import {
  dataAdapter,
  isProductDesignCanvasMeasurementRow as isMeasurementRow,
  parseNumerics,
  parseNumericsList,
  UPDATABLE_PROPERTIES,
} from "./domain-object";
import {
  ProductDesignCanvasMeasurement as Measurement,
  ProductDesignCanvasMeasurementRow as MeasurementRow,
} from "./types";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";
import generateLabel from "../../services/generate-label";

const TABLE_NAME = "product_design_canvas_measurements";

interface CountRow {
  count: number;
}

export class MeasurementNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "MeasurementNotFoundError";
  }
}

function handleForeignKeyViolation(
  canvasId: string,
  err: rethrow.ERRORS.ForeignKeyViolation
): never {
  if (err.constraint === "product_design_canvas_measurements_canvas_id_fkey") {
    throw new InvalidDataError(`Invalid canvas ID: ${canvasId}`);
  }

  throw err;
}

export async function create(
  data: Uninserted<Measurement>,
  trx?: Knex.Transaction
): Promise<Measurement> {
  const rowData = dataAdapter.forInsertion({
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
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.ForeignKeyViolation,
        handleForeignKeyViolation.bind(null, data.canvasId)
      )
    );

  if (!created) {
    throw new Error("Failed to create a measurement");
  }

  return parseNumerics(
    validate<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      created
    )
  );
}

export async function findById(id: string): Promise<Measurement | null> {
  const measurements: MeasurementRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ id, deleted_at: null })
    .limit(1);

  const measurement = measurements[0];
  if (!measurement) {
    return null;
  }

  return parseNumerics(
    validate<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      measurement
    )
  );
}

export async function update(
  id: string,
  data: Measurement
): Promise<Measurement> {
  const rowData = pick(dataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);

  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, "*")
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.ForeignKeyViolation,
        handleForeignKeyViolation.bind(null, data.canvasId)
      )
    );

  if (!updated) {
    throw new MeasurementNotFoundError("Measurement not found");
  }

  return parseNumerics(
    validate<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      updated
    )
  );
}

export async function deleteById(id: string): Promise<Measurement> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, "*")
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows));

  if (!deleted) {
    throw new MeasurementNotFoundError("Measurement not found");
  }

  return parseNumerics(
    validate<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      deleted
    )
  );
}

export async function findAllByCanvasId(
  canvasId: string,
  ktx: Knex = db
): Promise<Measurement[]> {
  const measurements: MeasurementRow[] = await ktx(TABLE_NAME)
    .select("*")
    .where({ canvas_id: canvasId, deleted_at: null })
    .orderBy("created_at", "desc");
  return parseNumericsList(
    validateEvery<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      measurements
    )
  );
}

export async function findAllByDesignId(
  ktx: Knex,
  designId: string
): Promise<Measurement[]> {
  const measurements = await ktx(TABLE_NAME)
    .distinct("product_design_canvas_measurements.id")
    .select("product_design_canvas_measurements.*")
    .join(
      "canvases",
      "canvases.id",
      "product_design_canvas_measurements.canvas_id"
    )
    .whereRaw(
      `
canvases.design_id = ?
AND product_design_canvas_measurements.deleted_at IS null
`,
      [designId]
    )
    .orderBy("product_design_canvas_measurements.created_at", "desc");

  return parseNumericsList(
    validateEvery<MeasurementRow, Measurement>(
      TABLE_NAME,
      isMeasurementRow,
      dataAdapter,
      measurements
    )
  );
}

export async function getLabel(canvasId: string): Promise<string> {
  const measurementCount = await db(TABLE_NAME)
    .count<CountRow[]>("*")
    .where({ canvas_id: canvasId })
    .then((rows: CountRow[]) => first<CountRow>(rows));
  if (!measurementCount) {
    throw new Error(`Failed to count rows for canvasId ${canvasId}`);
  }
  return generateLabel(measurementCount.count);
}
