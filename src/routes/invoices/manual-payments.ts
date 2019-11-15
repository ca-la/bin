import Knex from 'knex';

import db from '../../services/db';
import * as InvoicesDAO from '../../dao/invoices';
import * as InvoicePaymentsDAO from '../../components/invoice-payments/dao';
import InvalidDataError from '../../errors/invalid-data';

interface ManualPaymentRequest {
  userId: string;
  resolvePaymentId: string;
  totalCents?: string;
  createdAt: string | null;
}

export default function* createManualPaymentRecord(
  this: AuthedContext<ManualPaymentRequest>
): Iterator<any, any, any> {
  const { userId, resolvePaymentId, createdAt } = this.request.body;
  const { invoiceId } = this.params;

  this.assert(userId, 400, 'Missing user ID');
  this.assert(resolvePaymentId, 400, 'Missing resolve payment ID');
  this.assert(invoiceId, 400, 'Missing invoice ID');

  this.body = yield db.transaction(async (trx: Knex.Transaction) => {
    await db
      .raw('select * from invoices where id = ? for update', [invoiceId])
      .transacting(trx);

    const invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

    if (invoice.isPaid) {
      throw new InvalidDataError('This invoice is already paid');
    }

    const totalCents: number = Number(
      this.request.body.totalCents ||
        invoice.totalCents - (invoice.totalPaid || 0)
    );

    return await InvoicePaymentsDAO.createTrx(trx, {
      createdAt: createdAt ? new Date(createdAt) : undefined,
      creditUserId: null,
      deletedAt: null,
      invoiceId,
      paymentMethodId: null,
      resolvePaymentId,
      rumbleshipPurchaseHash: null,
      stripeChargeId: null,
      totalCents
    });
  });

  this.status = 201;
}
