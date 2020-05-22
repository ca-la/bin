import adapter from "./adapter";
import dao from "./dao";
import router from "./router";
import listeners from "./listeners";
import ApprovalStep, { ApprovalStepRow } from "./types";
import { CalaComponent } from "../../services/cala-component/types";
import notifications, { NotificationLayerSchema } from "./notifications";

const component: CalaComponent<
  ApprovalStep,
  ApprovalStepRow,
  NotificationLayerSchema
> = {
  adapter,
  dao,
  router: {
    ...router,
  },
  listeners,
  notifications,
};

export default component;
