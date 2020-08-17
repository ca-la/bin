import { buildDao } from "../../../services/cala-component/cala-dao";
import { TemplateCategory, TemplateCategoryRow } from "./types";
import adapter from "./adapter";

const dao = buildDao<TemplateCategory, TemplateCategoryRow>(
  "TemplateCategory",
  "template_categories",
  adapter,
  {
    orderColumn: "ordering",
  }
);

export default dao;
