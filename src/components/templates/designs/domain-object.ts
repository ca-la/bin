import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "@cala/ts-lib";

export interface TemplateDesign {
  designId: string;
}

export interface TemplateDesignRow {
  design_id: string;
}

export const dataAdapter = new DataAdapter<TemplateDesignRow, TemplateDesign>();

export function isTemplateDesign(
  candidate: object
): candidate is TemplateDesign {
  return hasProperties(candidate, "designId");
}

export function isTemplateDesignRow(row: object): row is TemplateDesignRow {
  return hasProperties(row, "design_id");
}
