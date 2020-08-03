import Knex from "knex";
import db from "../services/db";
import * as Logger from "../services/logger";

import * as Aftership from "../components/integrations/aftership/service";
import * as ShipmentTrackingsDAO from "../components/shipment-trackings/dao";
import { handleTrackingUpdates } from "../components/shipment-trackings/service";

async function run() {
  return db.transaction(async (trx: Knex.Transaction) => {
    const trackings = await ShipmentTrackingsDAO.find(trx, {});
    Logger.log(`Found ${trackings.length} shipment tracking rows`);
    for (const tracking of trackings) {
      let aftershipTracking = null;
      try {
        const data = await Aftership.getTracking(
          tracking.courier,
          tracking.trackingId
        );

        aftershipTracking = data.tracking;
      } catch (e) {
        Logger.log(e.message);
        continue;
      }

      const updates = Aftership.generateTrackingUpdate(
        aftershipTracking,
        tracking
      );
      Logger.log(
        ` - Updating: ${tracking.id}: ${tracking.courier} ${tracking.trackingId}`
      );
      await handleTrackingUpdates(trx, [updates]);
    }
  });
}

run()
  .then(() => {
    Logger.log("Success!");
    process.exit(0);
  })
  .catch((err: any) => {
    Logger.logServerError(err);
    process.exit(1);
  });
