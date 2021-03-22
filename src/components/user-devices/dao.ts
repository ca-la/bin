import { buildDao } from "../../services/cala-component/cala-dao";
import { UserDevice, UserDeviceRow, domain } from "./types";
import adapter from "./adapter";

const tableName = "user_devices";

const dao = buildDao<UserDevice, UserDeviceRow>(domain, tableName, adapter, {
  orderColumn: "created_at",
});

export default dao;

export const { create, createAll, find, findById, findOne, update } = dao;
