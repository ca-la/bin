import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import { AftershipTracking, AftershipTrackingRow, domain } from "./types";

const tableName = "aftership_trackings";

const dao = buildDao<AftershipTracking, AftershipTrackingRow>(
  domain,
  tableName,
  adapter,
  {
    orderColumn: "created_at",
    excludeDeletedAt: false,
  }
);

export default dao;

export const { create, createAll, find, findById, findOne, update } = dao;
