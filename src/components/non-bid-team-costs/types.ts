export enum Category {
  WEBSITE_DEVELOPMENT = "WEBSITE_DEVELOPMENT",
  BRANDING = "BRANDING",
  GHOST_DESIGN = "GHOST_DESIGN",
  OTHER = "OTHER",
}

export interface NonBidTeamCost {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string;
  category: Category;
  note: string | null;
  teamId: string;
  cents: number;
}

export interface NonBidTeamCostRow {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: string;
  category: Category;
  note: string | null;
  team_id: string;
  cents: string | number;
}

export function isNonBidTeamCostRow(
  candidate: object
): candidate is NonBidTeamCostRow {
  const keyset = new Set(Object.keys(candidate));

  return [
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "created_by",
    "category",
    "note",
    "team_id",
    "cents",
  ].every(keyset.has.bind(keyset));
}
