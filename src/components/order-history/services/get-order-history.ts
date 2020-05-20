import {
  generatePreviewLinks,
  ThumbnailAndPreviewLinks,
} from "../../../services/attach-asset-links";
import { findByInvoiceId as findPaymentsByInvoiceId } from "../../invoice-payments/dao";
import { InvoicePayment } from "../../invoice-payments/domain-object";
import { isFinanced } from "./is-financed";
import { getInvoicesByUser } from "../../../dao/invoices/search";
import { getLineItemsWithMetaByInvoiceId } from "../../../dao/line-items";
import { LineItemWithMeta } from "../../../domain-objects/line-item";
import Invoice = require("../../../domain-objects/invoice");

export interface InvoiceWithMeta extends Invoice {
  amountCreditApplied: number;
  isPayLater: boolean;
  lineItems: LineItemWithImageLinks[];
  payments: InvoicePayment[];
  totalUnits: number;
}

interface LineItemWithImageLinks extends LineItemWithMeta {
  imageLinks: ThumbnailAndPreviewLinks[];
}

/**
 * Retrieves all purchase history information for the given user.
 */
export async function getOrderHistory(options: {
  limit?: number;
  offset?: number;
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
    const isPayLater = isFinanced(invoice.totalCents, invoicePayments);
    const amountCreditApplied = invoicePayments.reduce(
      (accumulator: number, invoicePayment: InvoicePayment): number => {
        if (invoicePayment.creditUserId) {
          return invoicePayment.totalCents + accumulator;
        }

        return accumulator;
      },
      0
    );

    invoicesWithMeta.push({
      ...invoice,
      amountCreditApplied,
      isPayLater,
      lineItems: lineItemsWithImageLinks,
      payments: invoicePayments,
      totalUnits,
    });
  }

  return invoicesWithMeta;
}
