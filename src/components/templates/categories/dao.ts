import { buildDao } from "../../../services/cala-component/cala-dao";
import { TemplateCategory, TemplateCategoryRow } from "./types";
import adapter from "./adapter";

export default buildDao<TemplateCategory, TemplateCategoryRow>(
  "TemplateCategory",
  "template_categories",
  adapter,
  {
    orderColumn: "ordering",
  }
);
