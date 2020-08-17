import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "@cala/ts-lib";

export interface TemplateDesign {
  designId: string;
  templateCategoryId: string | null;
}

export interface TemplateDesignRow {
  design_id: string;
  template_category_id: string | null;
}

function encode(row: TemplateDesignRow): TemplateDesign {
  return {
    designId: row.design_id,
    templateCategoryId: row.template_category_id,
  };
}

function decode(data: TemplateDesign): TemplateDesignRow {
  return {
    design_id: data.designId,
    template_category_id: data.templateCategoryId,
  };
}

export const dataAdapter = new DataAdapter<TemplateDesignRow, TemplateDesign>(
  encode,
  decode
);

export function isTemplateDesign(
  candidate: object
): candidate is TemplateDesign {
  return hasProperties(candidate, "designId", "templateCategoryId");
}

export function isTemplateDesignRow(row: object): row is TemplateDesignRow {
  return hasProperties(row, "design_id", "template_category_id");
}
