import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export default interface StageTemplate {
  id: string;
  title: string;
  description: string | null;
}

export interface StageTemplateRow {
  id: string;
  title: string;
  description: string | null;
}

export const dataAdapter = new DataAdapter<StageTemplateRow, StageTemplate>();

export function isStageTemplateRow(row: object): row is StageTemplateRow {
  return hasProperties(
    row,
    'id',
    'title',
    'description'
  );
}
