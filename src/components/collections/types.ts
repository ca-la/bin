export interface Collection {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  title: string | null;
}

export interface CollectionRow {
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  description: string | null;
  id: string;
  title: string | null;
}

export interface CollectionSubmissionStatus {
  collectionId: string;
  isSubmitted: boolean;
  isCosted: boolean;
  isQuoted: boolean;
  isPaired: boolean;
  pricingExpiresAt: Date | null;
}
