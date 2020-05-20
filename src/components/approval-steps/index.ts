import adapter from "./adapter";
import dao from "./dao";
import router from "./router";
import listeners from "./listeners";
import ApprovalStep, { ApprovalStepRow } from "./types";
import { CalaComponent } from "../../services/cala-component/types";

const component: CalaComponent<ApprovalStep, ApprovalStepRow> = {
  adapter,
  dao,
  router: {
    ...router,
  },
  listeners,
};

export default component;
