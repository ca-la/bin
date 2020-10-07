import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get } from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");
import SessionsDAO from "../../dao/sessions";
import * as PayoutsDAO from "./dao";
import PartnerPayoutAccounts = require("../../dao/partner-payout-accounts");

const API_PATH = "/partner-payout-logs";

test(`GET ${API_PATH}/ returns the payout history of the logged in user`, async (t: Test) => {
  const getPayoutsStub = sandbox()
    .stub(PayoutsDAO, "findByUserId")
    .resolves([]);

  const { session, user } = await createUser();
  const [response, body] = await get(`${API_PATH}/`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200, "Responds successfully");
  t.deepEqual(body, [], "Returns an empty list");
  t.equal(getPayoutsStub.callCount, 1, "Payouts DAO method is called once");
  t.deepEqual(getPayoutsStub.args[0][1], user.id, "Calls with the user id");
});

test(`GET ${API_PATH}/?payoutAccountId returns the payout history of the user`, async (t: Test) => {
  const { session, user } = await createUser();
  const getPayoutsStub = sandbox()
    .stub(PayoutsDAO, "findByPayoutAccountId")
    .resolves([]);
  const accountsStub = sandbox()
    .stub(PartnerPayoutAccounts, "findById")
    .resolves({
      userId: user.id,
    });

  const [response, body] = await get(`${API_PATH}/?payoutAccountId=abc-123`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200, "Responds successfully");
  t.deepEqual(body, [], "Returns an empty list");
  t.equal(getPayoutsStub.callCount, 1, "Payouts DAO method is called once");
  t.equal(accountsStub.callCount, 1, "Accounts is called once");
  t.deepEqual(getPayoutsStub.args[0][1], "abc-123", "Calls with the user id");
});

test(`GET ${API_PATH}/?bidId returns the payout history of the bid`, async (t: Test) => {
  const sessionsStub = sandbox()
    .stub(SessionsDAO, "findById")
    .resolves({ role: "ADMIN", userId: "a-user-id" });
  const getPayoutsStub = sandbox()
    .stub(PayoutsDAO, "findByBidId")
    .resolves([{ id: "a-payout-log" }]);

  const [response, body] = await get(`${API_PATH}/?bidId=a-bid-id`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "Responds successfully");
  t.deepEqual(body, [{ id: "a-payout-log" }], "Returns the resolved DAO value");
  t.equal(getPayoutsStub.args[0][1], "a-bid-id", "calls DAO with bidId");

  sessionsStub.resolves({ role: "USER", userId: "a-user-id" });
  const [forbidden] = await get(`${API_PATH}/?bidId=a-bid-id`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(forbidden.status, 403, "Responds with Forbidden status");
});
