import * as process from 'process';
import * as Knex from 'knex';

import { log, logServerError } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import * as db from '../../services/db';
import * as QuotesDAO from '../../dao/pricing-quotes';
import { PricingQuote } from '../../domain-objects/pricing-quote';
import addMargin from '../../services/add-margin';
import { FINANCING_MARGIN } from '../../config';

run()
  .then(() => {
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

/**
 * Steps:
 * 1. Get quotes
 * 2. Get cost from quotes
 * 3. compute financing using service
 * 4. update invoices with new costs
 */
async function run(): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const payLaterInvoiceIds: { id: string, total_cents: number }[] = await db('invoices')
      .distinct('i.id')
      .select([
        'i.id',
        'i.total_cents'
      ])
      .from('invoices as i')
      .join('line_items as li', 'li.invoice_id', 'i.id')
      .leftJoin('invoice_payments as ip', 'ip.invoice_id', 'i.id')
      .whereNotNull('ip.resolve_payment_id')
      .transacting(trx);

    log(`${reset}Found ${payLaterInvoiceIds.length} invoices to recalculate`);

    let skippedCount = 0;
    for (const idObject of payLaterInvoiceIds) {
      const { id, total_cents: oldCents } = idObject;
      if (oldCents === 0) {
        logServerError(`${reset}${red}[ERROR] Invoice ${id} was for 0 cents`);
        skippedCount += 1;
        continue;
      }
      const quoteIds: { id: string}[] = await db('pricing_quotes')
        .select('q.id as id')
        .from('pricing_quotes as q')
        .join('line_items as li', 'li.quote_id', 'q.id')
        .join('invoices as i', 'i.id', 'li.invoice_id')
        .where({ 'i.id': id })
        .transacting(trx);
      const quotes = await Promise.all(quoteIds.map(async (idObj: {id: string}) => {
        const { id: quoteId } = idObj;
        return await QuotesDAO.findById(quoteId);
      }));
      if (quotes.length === 0) {
        logServerError(`${reset}${red}[ERROR] Invoice ${id} had no quotes`);
        skippedCount += 1;
        continue;
      }
      const totalCentsWithoutFinanceMargin = quotes
        .map((quote: PricingQuote | null) => quote ? quote.units * quote.unitCostCents : 0)
        .reduce((total: number, current: number) => total + current, 0);
      const totalCents = addMargin(totalCentsWithoutFinanceMargin, FINANCING_MARGIN);
      if (totalCents === 0) {
        logServerError(`${reset}${red}[ERROR] Invoice ${id} was set to 0 cents`);
        skippedCount += 1;
        continue;
      }
      await db('invoices')
        .update({ total_cents: totalCents })
        .where({ id })
        .transacting(trx);
      // tslint:disable-next-line:max-line-length
      log(`${reset}[INFO] Updated total for invoice ${id}: ${oldCents} -> ${totalCents} ~ ${totalCents - oldCents}`);
    }
    // tslint:disable-next-line:max-line-length
    log(`${green}[SUCCESS] Updated totals for ${payLaterInvoiceIds.length - skippedCount} invoices`);
  });
}
