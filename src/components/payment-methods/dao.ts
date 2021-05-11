import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import dataAdapter from "./adapter";

const dao = buildDao("PaymentMethods", "payment_methods", dataAdapter, {
  orderColumn: "created_at",
});

async function findByUserId(stx: Knex, userId: string) {
  return dao.find(stx, { userId });
}

export default {
  ...dao,
  findByUserId,
};
