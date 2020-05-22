import { CalaComponent } from "../../services/cala-component/types";
import notifications, { NotificationLayerSchema } from "./notifications";

const component: CalaComponent<never, never, NotificationLayerSchema> = {
  notifications,
};

export default component;
