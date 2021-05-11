import { buildDao } from "../../services/cala-component/cala-dao";
import dataAdapter from "./adapter";

export default buildDao("PaymentMethods", "payment_methods", dataAdapter, {
  orderColumn: "created_at",
});
