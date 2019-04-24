import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface ApprovedSignup {
  consumedAt: Date | null;
  createdAt: Date;
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
}

export interface ApprovedSignupRow {
  consumed_at: string | null;
  created_at: string;
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
}

export const dataAdapter = new DataAdapter<ApprovedSignupRow, ApprovedSignup>();

export function isApprovedSignupRow(row: object): row is ApprovedSignupRow {
  return hasProperties(
    row,
    'consumed_at',
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
    'consumedAt',
    'createdAt',
    'email',
    'firstName',
    'id',
    'lastName'
  );
}
