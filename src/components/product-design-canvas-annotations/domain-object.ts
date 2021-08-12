import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import {
  ProductDesignCanvasAnnotation,
  ProductDesignCanvasAnnotationRow,
} from "./types";

export const UPDATABLE_PROPERTIES = ["canvas_id", "x", "y"];

export function parseNumerics(
  annotation: ProductDesignCanvasAnnotation
): ProductDesignCanvasAnnotation {
  return {
    ...annotation,
    x: Number(annotation.x),
    y: Number(annotation.y),
  };
}

export function parseNumericsList(
  annotations: ProductDesignCanvasAnnotation[]
): ProductDesignCanvasAnnotation[] {
  return annotations.map(parseNumerics);
}

export const dataAdapter = new DataAdapter<
  ProductDesignCanvasAnnotationRow,
  ProductDesignCanvasAnnotation
>();

export function isProductDesignCanvasAnnotationRow(
  row: object
): row is ProductDesignCanvasAnnotationRow {
  return hasProperties(
    row,
    "canvas_id",
    "created_at",
    "created_by",
    "deleted_at",
    "id",
    "x",
    "y"
  );
}
