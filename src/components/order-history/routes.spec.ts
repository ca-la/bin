import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get } from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");
import * as HistoryService from "./services/get-order-history";

const API_PATH = "/order-history";

test(`GET ${API_PATH}/ returns the order history of the logged in user`, async (t: Test) => {
  const getHistoryStub = sandbox()
    .stub(HistoryService, "getOrderHistory")
    .resolves([]);

  const { session } = await createUser();

  const [response, body] = await get(`${API_PATH}/?type=designs`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200, "Responds successfully");
  t.deepEqual(body, [], "Returns an empty list");
  t.equal(
    getHistoryStub.callCount,
    1,
    "Purchase history DAO method is called once"
  );
});

test(`GET ${API_PATH}/ throws for incorrect query params`, async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await get(`${API_PATH}/`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 400, "Responds successfully");
  t.true(body.message.includes('Must specify a query param "type"'));
});
