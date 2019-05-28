import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import rethrow = require('pg-rethrow');

import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import db = require('../../services/db');
import first from '../../services/first';
import {
  dataAdapter,
  isPromoCodeRow,
  PromoCode,
  PromoCodeRow
} from './domain-object';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'promo_codes';

export async function findByCode(code: string): Promise<PromoCode | null> {
  const row = await db(TABLE_NAME)
    .select('*')
    .whereRaw(
      `
      lower(code) = lower(?)
      and (code_expires_at is null or code_expires_at > ?)
    `,
      [code, new Date().toISOString()]
    )
    .limit(1)
    .then((rows: PromoCodeRow[]) => first<PromoCodeRow>(rows));

  if (!row) {
    return null;
  }

  return validate<PromoCodeRow, PromoCode>(
    TABLE_NAME,
    isPromoCodeRow,
    dataAdapter,
    row
  );
}

export async function create(
  data: MaybeUnsaved<PromoCode>
): Promise<PromoCode> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: PromoCodeRow[]) => first<PromoCodeRow>(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: typeof rethrow.ERRORS.UniqueViolation) => {
          if (err.constraint === 'promo_code_unique') {
            throw new InvalidDataError('Promo code already exists');
          }
          throw err;
        }
      )
    );

  if (!created) {
    throw new Error('Failed to create promo code row');
  }

  return validate<PromoCodeRow, PromoCode>(
    TABLE_NAME,
    isPromoCodeRow,
    dataAdapter,
    created
  );
}

export async function update(
  promoCodeId: string,
  data: Partial<PromoCode>,
  trx?: Knex.Transaction
): Promise<PromoCode | null> {
  const rowData = {
    code_expires_at: data.codeExpiresAt && data.codeExpiresAt.toISOString()
  };

  const updated = await db(TABLE_NAME)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .where({ id: promoCodeId })
    .update(rowData, '*')
    .then((rows: PromoCodeRow[]) => first<PromoCodeRow>(rows));

  if (!updated) {
    return null;
  }

  return validate<PromoCodeRow, PromoCode>(
    TABLE_NAME,
    isPromoCodeRow,
    dataAdapter,
    updated
  );
}
