import { buildDao } from "../../services/cala-component/cala-dao";
import dataAdapter from "./adapter";

export default buildDao("Customers", "customers", dataAdapter, {
  orderColumn: "created_at",
});
