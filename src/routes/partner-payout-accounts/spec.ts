import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get } from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");
import * as Stripe from "../../services/stripe";

test(`GET /partner-payout-accounts/balances returns Stripe balances availbale for payout`, async (t: Test) => {
  sandbox().stub(Stripe, "getBalances").resolves({
    bank_account: 300123,
    card: 200456,
    financing: 100789,
  });

  const { session } = await createUser({ role: "ADMIN" });
  const [response, body] = await get("/partner-payout-accounts/balances", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200, "Responds successfully");
  t.deepEqual(body, {
    stripe: {
      bank_account: 300123,
      card: 200456,
      financing: 100789,
    },
  });
});

test(`GET /partner-payout-accounts/balances returns 403 to non-admins`, async (t: Test) => {
  sandbox().stub(Stripe, "getBalances").resolves({
    bank_account: 300123,
    card: 200456,
    financing: 100789,
  });

  const { session } = await createUser();
  const [response] = await get("/partner-payout-accounts/balances", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 403, "Responds with 403");
});
