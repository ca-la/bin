import DataAdapter from "../services/data-adapter";
import { hasProperties } from "../services/require-properties";

/**
 * @typedef {object} ProductDesignStageTask A joining row between product-design-stages and tasks
 *
 * @property {string} id The primary id
 * @property {string} designStageId The id of the product design stage
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 */

export default interface ProductDesignStageTask {
  designStageId: string;
  createdAt: Date;
  id: string;
  taskId: string;
}

export interface ProductDesignStageTaskRow {
  id: string;
  task_id: string;
  design_stage_id: string;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<
  ProductDesignStageTaskRow,
  ProductDesignStageTask
>();

export function isDesignStageTaskRow(
  row: object
): row is ProductDesignStageTaskRow {
  return hasProperties(row, "id", "task_id", "created_at", "design_stage_id");
}
