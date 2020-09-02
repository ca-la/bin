import { Permissions } from "../../services/get-permissions";

export interface CollectionDb {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  title: string | null;
  teamId: string | null;
}

export interface CollectionDbRow {
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  description: string | null;
  id: string;
  title: string | null;
  team_id: string | null;
}

export interface Collection extends CollectionDb {
  permissions: Permissions;
}

export interface CollectionSubmissionStatus {
  collectionId: string;
  isSubmitted: boolean;
  isCosted: boolean;
  isQuoted: boolean;
  isPaired: boolean;
  pricingExpiresAt: Date | null;
}
