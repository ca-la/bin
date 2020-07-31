import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import { ShipmentTracking, ShipmentTrackingRow, domain } from "./types";

const tableName = "shipment_trackings";

const standardDao = buildDao<ShipmentTracking, ShipmentTrackingRow>(
  domain,
  tableName,
  adapter,
  {
    orderColumn: "created_at",
  }
);

const dao = {
  ...standardDao,
  findByAftershipTracking(trx: Knex.Transaction, aftershipTrackingId: string) {
    return standardDao.findOne(trx, {}, (query: Knex.QueryBuilder) =>
      query
        .join(
          "aftership_trackings",
          "aftership_trackings.shipment_tracking_id",
          "shipment_trackings.id"
        )
        .where({ "aftership_trackings.id": aftershipTrackingId })
    );
  },
};

export default dao;

export const {
  create,
  createAll,
  find,
  findById,
  findOne,
  findByAftershipTracking,
  update,
} = dao;
