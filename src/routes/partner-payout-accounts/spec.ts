import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get } from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");
import * as Stripe from "../../services/stripe";
import * as PartnerPayoutAccountsDAO from "../../dao/partner-payout-accounts";
import SessionsDAO from "../../dao/sessions";

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

test(`GET /partner-payout-accounts?userId as ADMIN`, async (t: Test) => {
  const payoutAccount = { id: "account-id" };
  sandbox()
    .stub(PartnerPayoutAccountsDAO, "findByUserId")
    .resolves([payoutAccount]);
  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "ADMIN",
    userId: "a-user-id",
  });

  const [response, body] = await get(
    "/partner-payout-accounts?userId=a-user-id",
    {
      headers: authHeader("session-id"),
    }
  );

  t.equal(response.status, 200, "Responds with 200");
  t.deepEqual(body, [payoutAccount], "Returns accounts");
});

test(`GET /partner-payout-accounts?userId only allows self-lookup as user`, async (t: Test) => {
  const payoutAccount = { id: "account-id" };
  sandbox()
    .stub(PartnerPayoutAccountsDAO, "findByUserId")
    .resolves([payoutAccount]);
  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "USER",
    userId: "a-user-id",
  });

  const [requestForOwnRecordsResponse, body] = await get(
    "/partner-payout-accounts?userId=a-user-id",
    {
      headers: authHeader("session-id"),
    }
  );

  t.equal(requestForOwnRecordsResponse.status, 200, "Responds with 403");
  t.deepEqual(body, [payoutAccount], "Returns accounts");

  const [requestForDifferentUserResponse] = await get(
    "/partner-payout-accounts?userId=a-different-id",
    {
      headers: authHeader("session-id"),
    }
  );

  t.equal(requestForDifferentUserResponse.status, 403, "Responds with 403");
});

test(`GET /partner-payout-accounts?teamId as admin`, async (t: Test) => {
  const payoutAccount = { id: "account-id" };
  sandbox()
    .stub(PartnerPayoutAccountsDAO, "findByTeamId")
    .resolves([payoutAccount]);
  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "ADMIN",
    userId: "a-user-id",
  });

  const [response, body] = await get(
    "/partner-payout-accounts?teamId=a-team-id",
    {
      headers: authHeader("session-id"),
    }
  );

  t.equal(response.status, 200, "Responds with 200");
  t.deepEqual(body, [payoutAccount], "Returns accounts");
});

test(`GET /partner-payout-accounts?teamId does not allow non-admins`, async (t: Test) => {
  const payoutAccount = { id: "account-id" };
  sandbox()
    .stub(PartnerPayoutAccountsDAO, "findByTeamId")
    .resolves([payoutAccount]);
  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "USER",
    userId: "a-user-id",
  });

  const [response] = await get("/partner-payout-accounts?teamId=a-team-id", {
    headers: authHeader("session-id"),
  });

  t.equal(response.status, 403, "Responds with 403");
});
