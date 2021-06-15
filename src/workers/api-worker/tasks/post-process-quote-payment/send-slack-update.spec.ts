import { sandbox, test, Test } from "../../../../test-helpers/fresh";

import * as UsersDAO from "../../../../components/users/dao";
import * as CollectionsDAO from "../../../../components/collections/dao";
import * as SlackService from "../../../../services/slack";
import { sendSlackUpdate } from "./send-slack-update";
import Logger from "../../../../services/logger";

test("sendSlackUpdate throws if we can't find a user for invoice", async (t: Test) => {
  const findUserByIdStub = sandbox().stub(UsersDAO, "findById").resolves(null);

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      userId: "a-user-id",
      collectionId: "a-collection-id",
      paymentAmountCents: 15_000,
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.pass("throws an error when we can't find a designer");
    t.equal(
      err.message,
      "Cannot find a designer (a-user-id) for invoice an-invoice-id"
    );
  }

  t.equal(findUserByIdStub.callCount, 1);
});

test("sendSlackUpdate throws if we can't find a collection for invoice", async (t: Test) => {
  sandbox().stub(UsersDAO, "findById").resolves({ id: "a-user-id" });
  const findCollectionByIdStub = sandbox()
    .stub(CollectionsDAO, "findById")
    .resolves(null);

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      userId: "a-user-id",
      collectionId: "a-collection-id",
      paymentAmountCents: 15_000,
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.pass("throws an error when we can't find a designer");
    t.equal(
      err.message,
      "Cannot find a collection (a-collection-id) for invoice an-invoice-id"
    );
  }

  t.equal(findCollectionByIdStub.callCount, 1);
});

test("sendSlackUpdate", async (t: Test) => {
  const findByIdUserStub = sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ id: "a-user-id" });
  const findCollectionByIdStub = sandbox()
    .stub(CollectionsDAO, "findById")
    .resolves({ id: "a-collection-id" });
  const slackEnqueueSendStub = sandbox()
    .stub(SlackService, "enqueueSend")
    .resolves();
  const logWarningStub = sandbox().stub(Logger, "logWarning").resolves();

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      userId: "a-user-id",
      collectionId: "a-collection-id",
      paymentAmountCents: 15_000,
    });
  } catch {
    t.fail("Shouldn't throw any errors");
  }

  t.deepEqual(
    findByIdUserStub.args,
    [["a-user-id"]],
    "usersDAO findById is called with invoice user"
  );
  t.deepEqual(
    findCollectionByIdStub.args,
    [["a-collection-id"]],
    "collectionsDAO findById is called with invoice collection"
  );

  t.deepEqual(
    slackEnqueueSendStub.args,
    [
      [
        {
          channel: "designers",
          templateName: "designer_payment",
          params: {
            collection: { id: "a-collection-id" },
            designer: { id: "a-user-id" },
            paymentAmountCents: 15_000,
          },
        },
      ],
    ],
    "expected slack message is sent"
  );

  t.equal(logWarningStub.callCount, 0);
});

test("sendSlackUpdate log warning on slack service enqueue error ", async (t: Test) => {
  sandbox().stub(UsersDAO, "findById").resolves({ id: "a-user-id" });
  sandbox()
    .stub(CollectionsDAO, "findById")
    .resolves({ id: "a-collection-id" });
  const slackEnqueueSendStub = sandbox()
    .stub(SlackService, "enqueueSend")
    .rejects(new Error("Cannot send Slack message"));
  const logWarningStub = sandbox().stub(Logger, "logWarning").resolves();

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      userId: "a-user-id",
      collectionId: "a-collection-id",
      paymentAmountCents: 0,
    });
  } catch {
    t.fail("Shouldn't throw any errors");
  }

  t.deepEqual(
    slackEnqueueSendStub.args,
    [
      [
        {
          channel: "designers",
          templateName: "designer_payment",
          params: {
            collection: { id: "a-collection-id" },
            designer: { id: "a-user-id" },
            paymentAmountCents: 0,
          },
        },
      ],
    ],
    "expected slack message is sent"
  );

  t.deepEqual(logWarningStub.args, [
    [
      "There was a problem sending the payment notification to Slack",
      new Error("Cannot send Slack message"),
    ],
  ]);
});
