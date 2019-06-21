import rethrow = require('pg-rethrow');
import uuid = require('node-uuid');
import * as Knex from 'knex';

import db = require('../../services/db');
import first from '../../services/first';
import {
  dataAdapter,
  InvoicePayment,
  InvoicePaymentRow,
  isInvoicePaymentRow,
  MaybeSavedInvoicePayment
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'invoice_payments';

export async function findById(id: string): Promise<InvoicePayment | null> {
  const invoicePaymentRow = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: InvoicePaymentRow[]) => first<InvoicePaymentRow>(rows))
    .catch(rethrow);

  if (!invoicePaymentRow) {
    return null;
  }

  return validate<InvoicePaymentRow, InvoicePayment>(
    TABLE_NAME,
    isInvoicePaymentRow,
    dataAdapter,
    invoicePaymentRow
  );
}

export async function findByInvoiceId(
  invoiceId: string
): Promise<InvoicePayment[]> {
  const invoicePaymentRows = await db(TABLE_NAME)
    .select('*')
    .where({ invoice_id: invoiceId, deleted_at: null })
    .orderBy('created_at', 'DESC')
    .catch(rethrow);

  return validateEvery<InvoicePaymentRow, InvoicePayment>(
    TABLE_NAME,
    isInvoicePaymentRow,
    dataAdapter,
    invoicePaymentRows
  );
}

export async function createTrx(
  trx: Knex.Transaction,
  data: MaybeSavedInvoicePayment
): Promise<InvoicePayment> {
  const rowData = dataAdapter.toDb({
    createdAt: new Date(),
    id: uuid.v4(),
    paymentMethodId: null,
    resolvePaymentId: null,
    rumbleshipPurchaseHash: null,
    stripeChargeId: null,
    ...data,
    deletedAt: null
  });

  const created = await db(TABLE_NAME)
    .transacting(trx)
    .insert(rowData, '*')
    .then((rows: InvoicePaymentRow[]) => first<InvoicePaymentRow>(rows))
    .catch(rethrow);

  if (!created) {
    throw new Error('Failed to create invoice payment row');
  }

  return validate<InvoicePaymentRow, InvoicePayment>(
    TABLE_NAME,
    isInvoicePaymentRow,
    dataAdapter,
    created
  );
}
