import rethrow = require('pg-rethrow');

import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import * as db from '../../services/db';
import {
  ApprovedSignup,
  ApprovedSignupRow,
  dataAdapter,
  isApprovedSignupRow
} from './domain-object';
import first from '../../services/first';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'approved_signups';
const ERROR_CODES = {
  emailTaken: Symbol('Email taken')
};

export async function create(signup: ApprovedSignup): Promise<ApprovedSignup> {
  const rowData = dataAdapter.forInsertion(signup);

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((rows: ApprovedSignupRow[]) => first(rows))
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.UniqueViolation, (err: Error & { constraint: string }) => {
      switch (err.constraint) {
        case 'approved_signups_email_key':
          throw new InvalidDataError(
            'Email is already taken',
            ERROR_CODES.emailTaken
          );
        default:
          throw err;
      }
    }));

  return validate<ApprovedSignupRow, ApprovedSignup>(
    TABLE_NAME,
    isApprovedSignupRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<ApprovedSignup | null> {
  const signup: ApprovedSignupRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .then((rows: ApprovedSignupRow[]) => first(rows));

  if (!signup) {
    return null;
  }

  return validate<ApprovedSignupRow, ApprovedSignup>(
    TABLE_NAME,
    isApprovedSignupRow,
    dataAdapter,
    signup
  );
}
