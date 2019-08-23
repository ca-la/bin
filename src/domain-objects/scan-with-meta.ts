import DataAdapter from '../services/data-adapter';

interface Measurements {
  calculatedValues?: {
    [key: string]: number;
  };
}

export interface ScanWithMeta {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  isComplete: boolean;
  isStarted: boolean;
  measurements: Measurements;
  type: 'PHOTO' | 'HUMANSOLUTIONS';
  userId: string | null;
  fitPartnerCustomerId: string;
  shopifyUserId: string | null;
  phone: string | null;
}

export interface ScanWithMetaRow {
  id: string;
  created_at: string;
  deleted_at: string | null;
  is_complete: string;
  is_started: string;
  measurements: Measurements;
  type: 'PHOTO' | 'HUMANSOLUTIONS';
  user_id: string | null;
  fit_partner_customer_id: string;
  shopify_user_id: string | null;
  phone: string | null;
}

export const dataApater = new DataAdapter<ScanWithMetaRow, ScanWithMeta>();
