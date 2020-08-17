import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "@cala/ts-lib";

export interface TemplateDesign {
  designId: string;
}

export interface TemplateDesignRow {
  design_id: string;
}

function encode(row: TemplateDesignRow): TemplateDesign {
  return {
    designId: row.design_id,
  };
}

function decode(data: TemplateDesign): TemplateDesignRow {
  return {
    design_id: data.designId,
  };
}

export const dataAdapter = new DataAdapter<TemplateDesignRow, TemplateDesign>(
  encode,
  decode
);

export function isTemplateDesign(
  candidate: object
): candidate is TemplateDesign {
  return hasProperties(candidate, "designId");
}

export function isTemplateDesignRow(row: object): row is TemplateDesignRow {
  return hasProperties(row, "design_id");
}
