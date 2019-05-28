import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} TemplateComponent A component representing the "head" of a
 * component tree, which will be copied into a new "canvas" every time the
 * template is instantiated.
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {string} templateId The template this component relates to
 * @property {string} componentId The head of the component tree
 */
export default interface TemplateComponent {
  id: string;
  createdAt: Date;
  templateId: string;
  componentId: string;
}

export interface TemplateComponentRow {
  id: string;
  created_at: Date;
  template_id: string;
  component_id: string;
}

export const dataAdapter = new DataAdapter<
  TemplateComponentRow,
  TemplateComponent
>();

export function isTemplateComponentRow(
  row: object
): row is TemplateComponentRow {
  return hasProperties(row, 'id', 'created_at', 'template_id', 'component_id');
}
