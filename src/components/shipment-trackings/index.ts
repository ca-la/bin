import adapter from "./adapter";
import dao from "./dao";
import router from "./routes";
import listeners from "./listeners";
import { ShipmentTracking, ShipmentTrackingRow } from "./types";
import {
  CalaComponent,
  CalaAdapter,
  CalaDao,
  CalaRouter,
} from "../../services/cala-component/types";
import notifications, { NotificationLayerSchema } from "./notifications";

interface ShipmentTrackingComponent
  extends CalaComponent<
    ShipmentTracking,
    ShipmentTrackingRow,
    NotificationLayerSchema
  > {
  adapter: CalaAdapter<ShipmentTracking, ShipmentTrackingRow>;
  dao: CalaDao<ShipmentTracking>;
  router: CalaRouter;
}

const component: ShipmentTrackingComponent = {
  adapter,
  dao,
  router,
  notifications,
  listeners,
};

export default component;
