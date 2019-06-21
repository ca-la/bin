import { OrderHistory } from '../domain-object';
import { getOrderHistoryByUserId } from '../dao';
import {
  generatePreviewLinks,
  ThumbnailAndPreviewLinks
} from '../../../services/attach-asset-links';
import { findByInvoiceId as findPaymentsByInvoiceId } from '../../invoice-payments/dao';
import { InvoicePayment } from '../../invoice-payments/domain-object';
import { isFinanced } from './is-financed';
import addMargin from '../../../services/add-margin';
import { FINANCING_MARGIN } from '../../../config';

export interface OrderHistoryWithMeta extends OrderHistory {
  firstPaidAt: Date | null;
  imageLinks: ThumbnailAndPreviewLinks[];
  isCreditApplied: boolean;
  isPayLater: boolean;
  unitCostCents: number;
}

/**
 * Retrieves all purchase history information for the given user.
 */
export async function getOrderHistory(options: {
  limit?: number;
  offset?: number;
  userId: string;
}): Promise<OrderHistoryWithMeta[]> {
  const orderList = await getOrderHistoryByUserId(options);
  const orderListWithMeta: OrderHistoryWithMeta[] = [];

  for (const order of orderList) {
    const invoicePayments = await findPaymentsByInvoiceId(order.invoiceId);
    const imageLinks = generatePreviewLinks(order.designImageIds);
    const isPayLater = isFinanced(order.totalCostCents, invoicePayments);
    const isCreditApplied = invoicePayments.some(
      (invoicePayment: InvoicePayment): boolean => {
        return invoicePayment.creditUserId !== null;
      }
    );
    const firstPaidAt = invoicePayments[0]
      ? invoicePayments[0].createdAt
      : null;
    const unitCostCents = isPayLater
      ? addMargin(order.baseUnitCostCents, FINANCING_MARGIN)
      : order.baseUnitCostCents;

    orderListWithMeta.push({
      ...order,
      firstPaidAt,
      imageLinks,
      isCreditApplied,
      isPayLater,
      unitCostCents
    });
  }

  return orderListWithMeta;
}
