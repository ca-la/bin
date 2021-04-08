import { fromSchema } from "../../services/cala-component/cala-adapter";
import { creditSchema, creditRowSchema, Credit, CreditRow } from "./types";

const defaultAdapter = fromSchema({
  modelSchema: creditSchema,
  rowSchema: creditRowSchema,
});

export default {
  ...defaultAdapter,
  fromDb: (item: CreditRow): Credit => {
    return defaultAdapter.fromDb({
      ...item,
      credit_delta_cents: BigInt(item.credit_delta_cents),
    });
  },
  fromDbArray: (items: CreditRow[]): Credit[] => {
    return defaultAdapter.fromDbArray(
      items.map((item: CreditRow) => ({
        ...item,
        credit_delta_cents: BigInt(item.credit_delta_cents),
      }))
    );
  },
};
