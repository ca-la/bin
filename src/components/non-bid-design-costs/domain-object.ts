import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export enum Category {
  BLANKS = "BLANKS",
  UNCAPPED_DEVELOPMENT = "UNCAPPED_DEVELOPMENT",
  LABELS = "LABELS",
  REFERENCE_SAMPLES = "REFERENCE_SAMPLES",
  MATERIALS = "MATERIALS",
  FINISHING = "FINISHING",
  CUSTOM_PACKAGING = "CUSTOM_PACKAGING",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  OTHER = "OTHER",
}

export interface NonBidDesignCost {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  createdBy: string;
  category: Category;
  note: string | null;
  designId: string;
  cents: number;
}

export interface NonBidDesignCostRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  created_by: string;
  category: Category;
  note: string | null;
  design_id: string;
  cents: string | number;
}

function encode(row: NonBidDesignCostRow): NonBidDesignCost {
  return {
    id: row.id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    category: row.category,
    note: row.note,
    designId: row.design_id,
    cents: Number(row.cents),
  };
}

export const dataAdapter = new DataAdapter(encode);

export function isNonBidDesignCostRow(
  candidate: object
): candidate is NonBidDesignCostRow {
  return hasProperties(
    candidate,
    "id",
    "created_at",
    "deleted_at",
    "created_by",
    "category",
    "note",
    "design_id",
    "cents"
  );
}
