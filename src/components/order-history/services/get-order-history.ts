import {
  generatePreviewLinks,
  ThumbnailAndPreviewLinks,
} from "../../../services/attach-asset-links";
import db from "../../../services/db";
import { findByInvoiceId as findPaymentsByInvoiceId } from "../../invoice-payments/dao";
import { InvoicePayment } from "../../invoice-payments/domain-object";
import { getInvoicesByUser } from "../../../dao/invoices/search";
import { getLineItemsWithMetaByInvoiceId } from "../../../dao/line-items";
import { LineItemWithMeta } from "../../../domain-objects/line-item";
import Invoice = require("../../../domain-objects/invoice");
import { InvoiceFee } from "../../invoice-fee/types";
import InvoiceFeesDAO from "../../invoice-fee/dao";

export interface InvoiceWithMeta extends Invoice {
  amountCreditApplied: number;
  isPayLater: boolean;
  lineItems: LineItemWithImageLinks[];
  payments: InvoicePayment[];
  fees: InvoiceFee[];
  totalUnits: number;
}

interface LineItemWithImageLinks extends LineItemWithMeta {
  imageLinks: ThumbnailAndPreviewLinks[];
}

/**
 * Retrieves all purchase history information for the given user.
 */
export async function getOrderHistory(options: {
  limit: number | null;
  offset: number | null;
  userId: string;
}): Promise<InvoiceWithMeta[]> {
  const invoices = await getInvoicesByUser(options);
  const invoicesWithMeta: InvoiceWithMeta[] = [];

  for (const invoice of invoices) {
    const invoicePayments = await findPaymentsByInvoiceId(invoice.id);
    const lineItems = await getLineItemsWithMetaByInvoiceId(invoice.id);
    const lineItemsWithImageLinks = lineItems.map(
      (lineItem: LineItemWithMeta): LineItemWithImageLinks => {
        return {
          ...lineItem,
          imageLinks: generatePreviewLinks(lineItem.designImageIds || []),
        };
      }
    );
    const totalUnits = lineItems.reduce(
      (acc: number, lineItem: LineItemWithMeta): number => {
        return acc + lineItem.quotedUnits;
      },
      0
    );
    // Financed payments are ones with no user ID that point to a credit trx
    const isPayLater = invoicePayments.some(
      (payment: InvoicePayment) =>
        payment.creditTransactionId !== null && payment.creditUserId === null
    );
    const amountCreditApplied = invoicePayments.reduce(
      (accumulator: number, invoicePayment: InvoicePayment): number => {
        if (invoicePayment.creditUserId) {
          return invoicePayment.totalCents + accumulator;
        }

        return accumulator;
      },
      0
    );
    const invoiceFees = await InvoiceFeesDAO.findByInvoiceId(db, invoice.id);

    invoicesWithMeta.push({
      ...invoice,
      amountCreditApplied,
      isPayLater,
      lineItems: lineItemsWithImageLinks,
      payments: invoicePayments,
      fees: invoiceFees,
      totalUnits,
    });
  }

  return invoicesWithMeta;
}
