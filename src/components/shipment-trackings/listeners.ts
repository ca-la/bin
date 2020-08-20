import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { DaoCreated, DaoUpdated } from "../../services/pubsub/cala-events";

import * as Aftership from "../integrations/aftership/service";
import { ShipmentTracking, domain } from "./types";
import { handleTrackingUpdates, attachMeta } from "./service";
import {
  realtimeShipmentTrackingCreated,
  realtimeShipmentTrackingUpdated,
} from "./realtime";
import * as IrisService from "../../components/iris/send-message";

export const listeners: Listeners<ShipmentTracking, typeof domain> = {
  "dao.created": async (
    event: DaoCreated<ShipmentTracking, typeof domain>
  ): Promise<void> => {
    const { trx, created } = event;
    const { updates } = await Aftership.createTracking(trx, created);
    await handleTrackingUpdates(trx, updates);
    IrisService.sendMessage(
      realtimeShipmentTrackingCreated(await attachMeta(trx, event.created))
    );
  },
  "dao.updated": async ({
    trx,
    updated,
  }: DaoUpdated<ShipmentTracking, typeof domain>): Promise<void> =>
    IrisService.sendMessage(
      realtimeShipmentTrackingUpdated(await attachMeta(trx, updated))
    ),
};

export default buildListeners<ShipmentTracking, typeof domain>(
  domain,
  listeners
);
