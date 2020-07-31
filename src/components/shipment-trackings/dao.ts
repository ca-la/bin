import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import { ShipmentTracking, ShipmentTrackingRow, domain } from "./types";

const tableName = "shipment_trackings";

const dao = {
  ...buildDao<ShipmentTracking, ShipmentTrackingRow>(
    domain,
    tableName,
    adapter,
    {
      orderColumn: "created_at",
    }
  ),
};

export default dao;

export const { create, createAll, find, findById, findOne, update } = dao;
