import { buildAdapter } from "../../../services/cala-component/cala-adapter";
import { TemplateCategory, TemplateCategoryRow } from "./types";

function encode(row: TemplateCategoryRow): TemplateCategory {
  return {
    id: row.id,
    title: row.title,
    ordering: row.ordering,
  };
}

function decode(data: TemplateCategory): TemplateCategoryRow {
  return {
    id: data.id,
    title: data.title,
    ordering: data.ordering,
  };
}

export default buildAdapter<TemplateCategory, TemplateCategoryRow>({
  domain: "TemplateCategory",
  requiredProperties: ["id", "title", "ordering"],
  decodeTransformer: decode,
  encodeTransformer: encode,
});
