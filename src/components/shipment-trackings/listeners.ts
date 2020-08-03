import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { DaoCreated } from "../../services/pubsub/cala-events";

import Aftership from "../integrations/aftership/service";
import { ShipmentTracking, domain } from "./types";
import { handleTrackingUpdates } from "./service";

export const listeners: Listeners<ShipmentTracking, typeof domain> = {
  "dao.created": async (
    event: DaoCreated<ShipmentTracking, typeof domain>
  ): Promise<void> => {
    const { trx, created } = event;
    const { updates } = await Aftership.createTracking(trx, created);
    await handleTrackingUpdates(trx, updates);
  },
};

export default buildListeners<ShipmentTracking, typeof domain>(
  domain,
  listeners
);
