import { InvoicePayment } from '../../invoice-payments/domain-object';

/**
 * Determines whether financing was used to pay the invoice.
 * Heuristic for if it is pay later:
 * - there are no payment records
 * - there is at least one resolve payment record
 * - the total has not been paid in full
 * otherwise it is a pay now record.
 */
export function isFinanced(
  invoiceTotal: number,
  invoicePayments: InvoicePayment[]
): boolean {
  const hasPayments = invoicePayments.length > 0;
  const hasSomePayLater = invoicePayments.some(
    (invoicePayment: InvoicePayment): boolean => {
      return invoicePayment.resolvePaymentId !== null;
    }
  );
  const isFullyPaid =
    invoicePayments.reduce(
      (sum: number, invoicePayment: InvoicePayment): number => {
        return sum + invoicePayment.totalCents;
      },
      0
    ) >= invoiceTotal;

  if (!hasPayments || hasSomePayLater || !isFullyPaid) {
    return true;
  }

  return false;
}
