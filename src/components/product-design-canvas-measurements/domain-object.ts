import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export default interface ProductDesignCanvasMeasurement {
  id: string;
  createdAt: Date;
  canvasId: string;
  createdBy: string;
  deletedAt: Date | null;
  label: string;
  measurement: string;
  name: string | null;
  startingX: number;
  startingY: number;
  endingX: number;
  endingY: number;
}

export interface ProductDesignCanvasMeasurementRow {
  id: string;
  created_at: Date;
  canvas_id: string;
  created_by: string;
  deleted_at: Date | null;
  label: string;
  measurement: string;
  name: string | null;
  starting_x: number;
  starting_y: number;
  ending_x: number;
  ending_y: number;
}

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
