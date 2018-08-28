import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} Template A starting point for a new design. Consists of
 * mutliple components which will be instantiated as new "canvas" sections.
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {string} title The template title
 * @property {string} description A long-form description of the template
 */
export default interface Template {
  id: string;
  createdAt: Date;
  title: string;
  description: string;
}

export interface TemplateRow {
  id: string;
  created_at: Date;
  title: string;
  description: string;
}

export const dataAdapter = new DataAdapter<TemplateRow, Template>();

export function isTemplateRow(row: object): row is TemplateRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'title',
    'description'
  );
}
