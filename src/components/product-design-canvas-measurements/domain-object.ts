import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import {
  ProductDesignCanvasMeasurement,
  ProductDesignCanvasMeasurementRow,
} from "./types";

export const UPDATABLE_PROPERTIES = [
  "canvas_id",
  "ending_x",
  "ending_y",
  "label",
  "measurement",
  "name",
  "starting_x",
  "starting_y",
];

export function parseNumerics(
  measurement: ProductDesignCanvasMeasurement
): ProductDesignCanvasMeasurement {
  return {
    ...measurement,
    endingX: Number(measurement.endingX),
    endingY: Number(measurement.endingY),
    startingX: Number(measurement.startingX),
    startingY: Number(measurement.startingY),
  };
}

export function parseNumericsList(
  measurements: ProductDesignCanvasMeasurement[]
): ProductDesignCanvasMeasurement[] {
  return measurements.map(parseNumerics);
}

export const dataAdapter = new DataAdapter<
  ProductDesignCanvasMeasurementRow,
  ProductDesignCanvasMeasurement
>();

export function isProductDesignCanvasMeasurementRow(
  row: object
): row is ProductDesignCanvasMeasurementRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "canvas_id",
    "created_by",
    "deleted_at",
    "label",
    "measurement",
    "name",
    "starting_x",
    "starting_y",
    "ending_x",
    "ending_y"
  );
}
