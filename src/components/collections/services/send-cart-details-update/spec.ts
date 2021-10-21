import Knex from "knex";

import { test, Test, db, sandbox } from "../../../../test-helpers/fresh";
import * as CostMetaService from "../cost-meta";
import * as IrisService from "../../../iris/send-message";
import * as NotificationsService from "../../../notifications/service";
import { sendCartDetailsUpdate } from ".";

test("sendCartDetailsUpdate: when collection doesn't have cart details", async (t: Test) => {
  const getCartDetailsStub = sandbox()
    .stub(CostMetaService, "getCollectionCartDetails")
    .resolves(null);
  const getUsersStub = sandbox().stub(
    NotificationsService,
    "getUsersWhoCanCheckoutByCollectionId"
  );
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  await sendCartDetailsUpdate(db, "a-collection-id");

  t.is(getCartDetailsStub.callCount, 1, "cart details is called");
  t.is(
    getUsersStub.callCount,
    0,
    "get users is not called when collection doesn't have cart details"
  );
  t.is(
    irisStub.callCount,
    0,
    "real-time sendMessage is not called when collection doesn't have cart details"
  );
});

test("sendCartDetailsUpdate", async (t: Test) => {
  const ktxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const getCartDetailsStub = sandbox()
    .stub(CostMetaService, "getCollectionCartDetails")
    .resolves({ id: "a-collection-id" });
  const getUsersStub = sandbox()
    .stub(NotificationsService, "getUsersWhoCanCheckoutByCollectionId")
    .returns(["a-user-id-1", "a-user-id-2"]);
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  await sendCartDetailsUpdate(ktxStub, "a-collection-id");

  t.deepEqual(
    getCartDetailsStub.args,
    [[ktxStub, "a-collection-id"]],
    "cart details is called with right args"
  );
  t.deepEqual(
    getUsersStub.args,
    [[ktxStub, "a-collection-id"]],
    "get users is call with right args"
  );
  t.is(
    irisStub.callCount,
    2,
    "real-time sendMessage is called twice, because we have two recipients"
  );

  t.deepEqual(
    irisStub.args,
    [
      [
        {
          channels: ["updates/a-user-id-1"],
          resource: { id: "a-collection-id" },
          type: "cart-details/collection-updated",
        },
      ],
      [
        {
          channels: ["updates/a-user-id-2"],
          resource: { id: "a-collection-id" },
          type: "cart-details/collection-updated",
        },
      ],
    ],
    "sendMessage is called with right real-time message"
  );
});
