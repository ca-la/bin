import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import {
  ShipmentTrackingEvent,
  ShipmentTrackingEventRow,
  domain,
} from "./types";

const tableName = "shipment_tracking_events";

const standardDao = buildDao<ShipmentTrackingEvent, ShipmentTrackingEventRow>(
  domain,
  tableName,
  adapter,
  {
    orderColumn: "created_at",
  }
);

const dao = {
  ...standardDao,
  findLatestByShipmentTracking(
    trx: Knex.Transaction,
    shipmentTrackingId: string
  ): Promise<ShipmentTrackingEvent | null> {
    return standardDao.findOne(
      trx,
      { shipmentTrackingId },
      (query: Knex.QueryBuilder) =>
        query.clearOrder().orderBy("created_at", "desc")
    );
  },
};

export const {
  create,
  createAll,
  find,
  findLatestByShipmentTracking,
  update,
} = dao;

export default {
  create,
  createAll,
  find,
  findLatestByShipmentTracking,
  update,
};