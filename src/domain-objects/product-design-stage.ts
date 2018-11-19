import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} Task A unit of work to be completed in the developement of a garment
 *
 * @property {string} id Primary id
 * @property {string} designId The id of the design that this stage applies to
 * @property {Date} createdAt Date when this record was created
 * @property {string} title The title of the stage
 */

export interface ProductDesignStageRequest {
  designId: string;
  title: string;
  description: string | null;
  stageTemplateId?: string | null;
  ordering: number;
}

export default interface ProductDesignStage extends ProductDesignStageRequest {
  createdAt: Date;
  id: string;
}

export interface ProductDesignStageRow {
  id: string;
  design_id: string;
  created_at: Date;
  stage_template_id: string | null;
  title: string;
  ordering: number;
}

export const dataAdapter = new DataAdapter<ProductDesignStageRow, ProductDesignStage>();

export function isDesignStageRequest(
  candidate: object
): candidate is ProductDesignStageRequest {
  return hasProperties(
    candidate,
    'designId',
    'title',
    'ordering'
  );
}

export function isDesignStageRow(row: object): row is ProductDesignStageRow {
  return hasProperties(
    row,
    'id',
    'design_id',
    'created_at',
    'title',
    'ordering'
  );
}
