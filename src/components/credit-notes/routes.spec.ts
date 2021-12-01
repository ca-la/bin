import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";
import SessionsDAO from "../../dao/sessions";
import * as ReverseCollectionCheckoutService from "../../services/reverse-collection-checkout";
import ResourceNotFoundError from "../../errors/resource-not-found";

function setup() {
  return {
    sessionStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role: "ADMIN",
      userId: "a-user-id",
    }),
    reverseCollectionCheckoutStub: sandbox()
      .stub(ReverseCollectionCheckoutService, "reverseCollectionCheckout")
      .resolves(),
  };
}

test("POST /credit-notes: not admin", async (t: Test) => {
  const { sessionStub, reverseCollectionCheckoutStub } = setup();
  sessionStub.resolves({
    role: "USER",
  });

  const [response] = await post("/credit-notes", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "does not allow non-admin to reverse checkout");
  t.equal(
    reverseCollectionCheckoutStub.callCount,
    0,
    "does not call the reverse checkout service"
  );
});

test("POST /credit-notes: unknown collection", async (t: Test) => {
  const { reverseCollectionCheckoutStub } = setup();
  reverseCollectionCheckoutStub.rejects(new ResourceNotFoundError("Oh no!"));

  const collectionId = uuid.v4();

  const [response] = await post("/credit-notes", {
    headers: authHeader("a-session-id"),
    body: { collectionId },
  });

  t.equal(response.status, 404, "returns 404 of collection is not found");
  t.deepEqual(
    reverseCollectionCheckoutStub.args,
    [[reverseCollectionCheckoutStub.args[0][0], collectionId, "a-user-id"]],
    "calls the collection checkout service"
  );
});

test("POST /credit-notes", async (t: Test) => {
  const { reverseCollectionCheckoutStub } = setup();

  const collectionId = uuid.v4();

  const [response] = await post("/credit-notes", {
    headers: authHeader("a-session-id"),
    body: { collectionId },
  });

  t.equal(response.status, 204, "returns a 204 no content response");
  t.deepEqual(
    reverseCollectionCheckoutStub.args,
    [[reverseCollectionCheckoutStub.args[0][0], collectionId, "a-user-id"]],
    "calls the collection checkout service"
  );
});
