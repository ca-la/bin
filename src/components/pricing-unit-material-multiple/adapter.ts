import DataAdapter from "../../services/data-adapter";
import {
  PricingUnitMaterialMultiple,
  PricingUnitMaterialMultipleRow,
} from "./types";

function encode(
  row: PricingUnitMaterialMultipleRow
): PricingUnitMaterialMultiple {
  return {
    id: row.id,
    createdAt: row.created_at,
    version: row.version,
    minimumUnits: row.minimum_units,
    multiple: Number(row.multiple),
  };
}

export const dataAdapter = new DataAdapter<
  PricingUnitMaterialMultipleRow,
  PricingUnitMaterialMultiple
>(encode);
