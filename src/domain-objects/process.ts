import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} Process a way in which two components can be connected
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 */
export default interface Process {
  id: string;
  createdAt: Date;
}

export interface ProcessRow {
  id: string;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<ProcessRow, Process>();

export function isProcessRow(row: object): row is ProcessRow {
  return hasProperties(
    row,
    'id',
    'created_at'
  );
}
