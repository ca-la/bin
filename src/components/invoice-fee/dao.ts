import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";

const standardDao = buildDao("InvoiceFee", "invoice_fees", adapter, {
  orderColumn: "created_at",
});

export default {
  ...standardDao,

  findByInvoiceId(ktx: Knex, invoiceId: string) {
    return standardDao.find(ktx, { invoiceId });
  },
};
