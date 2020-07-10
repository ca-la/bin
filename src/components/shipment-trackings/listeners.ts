import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { DaoCreated } from "../../services/pubsub/cala-events";

import Aftership from "../integrations/aftership/service";
import { ShipmentTracking, domain } from "./types";

export const listeners: Listeners<ShipmentTracking, typeof domain> = {
  "dao.created": async (
    event: DaoCreated<ShipmentTracking, typeof domain>
  ): Promise<void> => {
    const { trx, created } = event;
    await Aftership.createTracking(trx, created);
  },
};

export default buildListeners<ShipmentTracking, typeof domain>(
  domain,
  listeners
);
