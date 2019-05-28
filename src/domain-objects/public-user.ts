import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PublicUser a partial object of the User object.
 */

export default interface PublicUser {
  id: string;
  name: string;
  referralCode: string;
}

export interface PublicUserRow {
  id: string;
  name: string;
  referral_code: string;
}

export const dataAdapter = new DataAdapter<PublicUserRow, PublicUser>();

export function isPublicUserRow(row: object): row is PublicUserRow {
  return hasProperties(row, 'id', 'name', 'referral_code');
}
