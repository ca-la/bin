import DataAdapter, { defaultEncoder } from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export default interface MonthlySalesReport {
  id: string;
  createdAt: Date;
  createdBy: string;
  designerId: string;
  availableCreditCents: number;
  costOfReturnedGoodsCents: number;
  financingBalanceCents: number;
  financingPrincipalPaidCents: number;
  fulfillmentCostCents: number;
  paidToDesignerCents: number;
  revenueCents: number;
  revenueSharePercentage: number;
}

export interface MonthlySalesReportRow {
  id: string;
  created_at: Date;
  created_by: string;
  designer_id: string;
  available_credit_cents: number;
  cost_of_returned_goods_cents: number;
  financing_balance_cents: number;
  financing_principal_paid_cents: number;
  fulfillment_cost_cents: number;
  paid_to_designer_cents: number;
  revenue_cents: number;
  revenue_share_percentage: number;
}

function encode(row: MonthlySalesReportRow): MonthlySalesReport {
  return {
    ...defaultEncoder<MonthlySalesReportRow, MonthlySalesReport>(row),
    createdAt: new Date(row.created_at),
    availableCreditCents: Number(row.available_credit_cents),
    costOfReturnedGoodsCents: Number(row.cost_of_returned_goods_cents),
    financingBalanceCents: Number(row.financing_balance_cents),
    financingPrincipalPaidCents: Number(row.financing_principal_paid_cents),
    fulfillmentCostCents: Number(row.fulfillment_cost_cents),
    paidToDesignerCents: Number(row.paid_to_designer_cents),
    revenueCents: Number(row.revenue_cents),
    revenueSharePercentage: Number(row.revenue_share_percentage)
  };
}

export const dataAdapter = new DataAdapter<
  MonthlySalesReportRow,
  MonthlySalesReport
>(encode);

export function isMonthlySalesReportRow(
  row: object
): row is MonthlySalesReportRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'created_by',
    'designer_id',
    'available_credit_cents',
    'cost_of_returned_goods_cents',
    'financing_balance_cents',
    'financing_principal_paid_cents',
    'fulfillment_cost_cents',
    'paid_to_designer_cents',
    'revenue_cents',
    'revenue_share_percentage'
  );
}
