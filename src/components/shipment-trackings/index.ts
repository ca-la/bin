import adapter from "./adapter";
import dao from "./dao";
import router from "./routes";
import { ShipmentTracking, ShipmentTrackingRow } from "./types";
import {
  CalaComponent,
  CalaAdapter,
  CalaDao,
  CalaRouter,
} from "../../services/cala-component/types";

interface ShipmentTrackingComponent
  extends CalaComponent<ShipmentTracking, ShipmentTrackingRow, {}> {
  adapter: CalaAdapter<ShipmentTracking, ShipmentTrackingRow>;
  dao: CalaDao<ShipmentTracking>;
  router: CalaRouter;
  notifications: {};
}

const component: ShipmentTrackingComponent = {
  adapter,
  dao,
  router,
  notifications: {},
};

export default component;
