import adapter from "./adapter";
import dao from "./dao";
import router from "./routes";
import { TemplateCategory, TemplateCategoryRow } from "./types";
import {
  CalaComponent,
  CalaAdapter,
  CalaDao,
  CalaRouter,
} from "../../../services/cala-component/types";

interface TemplateCategoryComponent
  extends CalaComponent<TemplateCategory, TemplateCategoryRow> {
  adapter: CalaAdapter<TemplateCategory, TemplateCategoryRow>;
  dao: CalaDao<TemplateCategory>;
  router: CalaRouter;
}

const component: TemplateCategoryComponent = {
  adapter,
  dao,
  router,
  notifications: {},
};

export default component;
