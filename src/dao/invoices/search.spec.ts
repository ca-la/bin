import Knex = require("knex");
import { test, Test } from "../../test-helpers/fresh";
import { getInvoicesByUser } from "./search";
import createUser = require("../../test-helpers/create-user");
import generateInvoice from "../../test-helpers/factories/invoice";
import generateAddress from "../../test-helpers/factories/address";
import { createFromAddress } from "../invoice-addresses";
import db = require("../../services/db");

test("getInvoicesByUser returns a list of undeleted invoices", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await generateInvoice();

  const address = await generateAddress({ userId: user.id });
  const invoiceAddress = await db.transaction((trx: Knex.Transaction) =>
    createFromAddress(trx, address.id)
  );
  const { invoice: invoice1 } = await generateInvoice({ userId: user.id });
  const { invoice: invoice2 } = await generateInvoice({
    userId: user.id,
    invoiceAddressId: invoiceAddress.id,
  });
  const result = await getInvoicesByUser({ userId: user.id });

  t.deepEqual(
    result,
    [
      { ...invoice2, invoiceAddress },
      { ...invoice1, invoiceAddress: null },
    ],
    "Returns a list of invoices for the user"
  );
});
