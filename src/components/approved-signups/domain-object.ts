import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface ApprovedSignup {
  createdAt: Date;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
}

export interface ApprovedSignupRow {
  created_at: string;
  email: string;
  first_name: string;
  id: string;
  last_name: string;
}

export const dataAdapter = new DataAdapter<ApprovedSignupRow, ApprovedSignup>();

export function isApprovedSignupRow(row: object): row is ApprovedSignupRow {
  return hasProperties(
    row,
    'created_at',
    'email',
    'first_name',
    'id',
    'last_name'
  );
}

export function isApprovedSignup(data: object): data is ApprovedSignup {
  return hasProperties(
    data,
    'createdAt',
    'email',
    'firstName',
    'id',
    'lastName'
  );
}
