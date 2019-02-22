import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface InvoicePaymentRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  invoice_id: string;
  total_cents: number;
  payment_method_id: string | null;
  stripe_charge_id: string | null;
  rumbleship_purchase_hash: string | null;
  resolve_payment_id: string | null;
}

export default interface InvoicePayment {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  invoiceId: string;
  totalCents: number;
  paymentMethodId: string | null;
  stripeChargeId: string | null;
  rumbleshipPurchaseHash: string | null;
  resolvePaymentId: string | null;
}

interface InvoicePaymentRequestBase {
  invoiceId: string;
  totalCents: number;
}

interface StripePayment extends InvoicePaymentRequestBase {
  paymentMethodId: string;
  stripeChargeId: string;
}

interface RumbleshipPayment extends InvoicePaymentRequestBase {
  rumbleshipPurchaseHash: string;
}

interface ResolvePayment extends InvoicePaymentRequestBase {
  resolvePaymentId: string;
  createdAt?: Date;
}

export type InvoicePaymentRequest = StripePayment | RumbleshipPayment | ResolvePayment;

export const dataAdapter = new DataAdapter<InvoicePaymentRow, InvoicePayment>();

export function isInvoicePaymentRow(row: object): row is InvoicePaymentRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'deleted_at',
    'invoice_id',
    'total_cents',
    'payment_method_id',
    'stripe_charge_id',
    'rumbleship_purchase_hash',
    'resolve_payment_id'
  );
}

export function isInvoicePayment(row: object): row is InvoicePayment {
  return hasProperties(
    row,
    'id',
    'createdAt',
    'deletedAt',
    'invoiceId',
    'totalCents',
    'paymentMethodId',
    'stripeChargeId',
    'rumbleshipPurchaseHash',
    'resolvePaymentId'
  );
}
