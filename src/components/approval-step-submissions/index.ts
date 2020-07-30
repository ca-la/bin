import { CalaComponent } from "../../services/cala-component/types";
import notifications, { NotificationLayerSchema } from "./notifications";
import listeners from "./listeners";

const component: CalaComponent<never, never, NotificationLayerSchema> = {
  notifications,
  listeners,
};

export default component;
