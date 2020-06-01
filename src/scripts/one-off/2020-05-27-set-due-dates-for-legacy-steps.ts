import Knex from "knex";
import process from "process";
import meow from "meow";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import { findByDesignIds } from "../../dao/pricing-quotes";
import { setApprovalStepsDueAtByPricingQuote } from "../../components/approval-steps/service";

import { getInvoicesBuilder } from "../../dao/invoices/view";
import Invoice from "../../domain-objects/invoice";
import ProductDesign from "../../components/product-designs/domain-objects/product-design";
import { findByCollectionId } from "../../components/product-designs/dao";

const HELP_TEXT = `
Set due dates for all approval steps

Usage
$ bin/run [environment] src/scripts/one-off/2020-05-27-set-due-dates-for-legacy-steps.ts
`;

meow(HELP_TEXT);

async function getPaidInvoices(): Promise<Invoice[]> {
  return db
    .select("view.*")
    .from(getInvoicesBuilder().as("view"))
    .where({
      "view.is_paid": true,
      "view.deleted_at": null,
    })
    .orderBy("created_at", "desc")
    .then((invoices: any[]) => invoices.map((row: any) => new Invoice(row)));
}

async function main(): Promise<string> {
  const paidInvoices = await getPaidInvoices();

  await db.transaction(async (trx: Knex.Transaction) => {
    // eslint-disable-next-line
    for (let i = 0; i < paidInvoices.length; i = i + 1) {
      const invoice = paidInvoices[i];

      const designIds = invoice.designId
        ? [invoice.designId]
        : invoice.collectionId
        ? (await findByCollectionId(invoice.collectionId)).map(
            (design: ProductDesign) => design.id
          )
        : [];

      if (designIds.length === 0) {
        log(`${i}/${paidInvoices.length} no design ids`);
        continue;
      }

      if (!invoice.createdAt) {
        log(`${i}/${paidInvoices.length} no invoice.createdAt`);
        continue;
      }

      const pricingQuotes = await findByDesignIds(designIds);
      if (!pricingQuotes || pricingQuotes.length === 0) {
        log(`${i}/${paidInvoices.length} no pricing quotes found`);
        continue;
      }
      log(
        `${i}/${paidInvoices.length} Patching steps for invoice #${invoice.id} created at ${invoice.createdAt}, pricing quotes: ${pricingQuotes.length}`
      );

      for (const quote of pricingQuotes) {
        await setApprovalStepsDueAtByPricingQuote(
          trx,
          quote,
          invoice.createdAt
        );
      }
    }
  });

  return format(green, "Success!");
}

main()
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
