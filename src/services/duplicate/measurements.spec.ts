import tape from "tape";
import Knex from "knex";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import generateMeasurement from "../../test-helpers/factories/product-design-canvas-measurement";

import Measurement from "../../domain-objects/product-design-canvas-measurement";
import { findAndDuplicateMeasurements } from "./measurements";

test("findAndDuplicateMeasurements", async (t: tape.Test) => {
  const { canvas, createdBy, measurement } = await generateMeasurement({
    name: "wattup",
  });
  const { measurement: measurementTwo } = await generateMeasurement({
    canvasId: canvas.id,
    createdBy: createdBy.id,
    name: "yo",
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicateMeasurements = await findAndDuplicateMeasurements(
      canvas.id,
      canvas.id,
      trx
    );
    const m1 = duplicateMeasurements.find(
      (m: Measurement): boolean => m.name === "wattup"
    );
    const m2 = duplicateMeasurements.find(
      (m: Measurement): boolean => m.name === "yo"
    );
    if (!m1 || !m2) {
      throw new Error("Duplicate measurements were not found!");
    }

    t.equal(
      duplicateMeasurements.length,
      2,
      "Only the two created measurements were duplicated."
    );
    t.deepEqual(
      [m1, m2],
      [
        { ...measurement, createdAt: m1.createdAt, id: m1.id },
        { ...measurementTwo, createdAt: m2.createdAt, id: m2.id },
      ],
      "Returns the duplicate measurements"
    );
  });
});
