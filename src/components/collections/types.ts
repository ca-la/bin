import * as z from "zod";

import { Permissions } from "../permissions/types";

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

export const collectionUpdateSchema = z
  .object({
    description: z.string().nullable(),
    title: z.string().nullable(),
    teamId: z.string(),
  })
  .partial();

export type CollectionUpdate = z.infer<typeof collectionUpdateSchema>;
