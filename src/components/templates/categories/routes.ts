import requireAuth = require("../../../middleware/require-auth");

import TemplateCategoriesDAO from "./dao";
import { buildRouter } from "../../../services/cala-component/cala-router";
import { TemplateCategory } from "./types";

export default buildRouter<TemplateCategory>(
  "TemplateCategory",
  "/template-categories",
  TemplateCategoriesDAO,
  {
    pickRoutes: ["find"],
    routeOptions: {
      find: {
        middleware: [requireAuth],
      },
    },
  }
);
