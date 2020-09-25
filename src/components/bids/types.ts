export interface BidDb {
  id: string;
  createdAt: Date;
  createdBy: string;
  dueDate: Date | null;
  quoteId: string;
  bidPriceCents: number;
  revenueShareBasisPoints: number;
  bidPriceProductionOnlyCents: number;
  description: string | null;
}

export interface BidDbRow {
  id: string;
  created_at: Date;
  created_by: string;
  due_date: Date | null;
  quote_id: string;
  bid_price_cents: number;
  revenue_share_basis_points: number;
  bid_price_production_only_cents: number;
  description: string | null;
}
