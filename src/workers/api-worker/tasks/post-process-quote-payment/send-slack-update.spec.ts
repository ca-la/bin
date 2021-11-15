import { sandbox, test, Test } from "../../../../test-helpers/fresh";

import InvoicesDAO from "../../../../dao/invoices";
import * as UsersDAO from "../../../../components/users/dao";
import * as CollectionsDAO from "../../../../components/collections/dao";
import * as LineItemsDAO from "../../../../dao/line-items";
import TeamsDAO from "../../../../components/teams/dao";
import * as SlackService from "../../../../services/slack";
import db from "../../../../services/db";
import { sendSlackUpdate } from "./send-slack-update";
import Logger from "../../../../services/logger";

function setup() {
  const findLineItemsStub = sandbox()
    .stub(LineItemsDAO, "getLineItemsWithMetaByInvoiceId")
    .resolves([
      { designId: "d1", quotedUnitCostCents: 10_00, quotedUnits: 100 },
      { designId: "d2", quotedUnitCostCents: 5_00, quotedUnits: 100 },
    ]);
  const findInvoiceStub = sandbox().stub(InvoicesDAO, "findById").resolves({
    id: "an-invoice-id",
    userId: "a-user-id",
    totalCents: 2500_00,
  });
  const findUserStub = sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ id: "a-user-id" });
  const findCollectionStub = sandbox()
    .stub(CollectionsDAO, "findById")
    .resolves({ id: "a-collection-id", teamId: "a-team-id" });
  const findTeamStub = sandbox()
    .stub(TeamsDAO, "findById")
    .resolves({ id: "a-team-id" });
  const slackEnqueueSendStub = sandbox()
    .stub(SlackService, "enqueueSend")
    .resolves();
  const logWarningStub = sandbox().stub(Logger, "logWarning").resolves();

  return {
    findLineItemsStub,
    findInvoiceStub,
    findUserStub,
    findCollectionStub,
    findTeamStub,
    slackEnqueueSendStub,
    logWarningStub,
  };
}

test("sendSlackUpdate throws if we can't find a user for invoice", async (t: Test) => {
  const { findInvoiceStub, findUserStub } = setup();
  findUserStub.resolves(null);

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      collectionId: "a-collection-id",
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.pass("throws an error when we can't find a designer");
    t.equal(
      err.message,
      "Cannot find a designer (a-user-id) for invoice an-invoice-id"
    );
  }

  t.deepEqual(findInvoiceStub.args, [["an-invoice-id"]]);
  t.deepEqual(findUserStub.args, [["a-user-id"]]);
});

test("sendSlackUpdate throws if we can't find a collection for invoice", async (t: Test) => {
  const { findInvoiceStub, findCollectionStub } = setup();

  findCollectionStub.resolves(null);

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      collectionId: "a-collection-id",
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.pass("throws an error when we can't find a designer");
    t.equal(
      err.message,
      "Cannot find a collection (a-collection-id) for invoice an-invoice-id"
    );
  }

  t.deepEqual(findInvoiceStub.args, [["an-invoice-id"]]);
  t.deepEqual(findCollectionStub.args, [["a-collection-id"]]);
});

test("sendSlackUpdate", async (t: Test) => {
  const {
    findInvoiceStub,
    findCollectionStub,
    findUserStub,
    findTeamStub,
    slackEnqueueSendStub,
    logWarningStub,
  } = setup();

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      collectionId: "a-collection-id",
    });
  } catch {
    t.fail("Shouldn't throw any errors");
  }

  t.deepEqual(
    findInvoiceStub.args,
    [["an-invoice-id"]],
    "InvoicesDAO findById is called with the invoie id"
  );
  t.deepEqual(
    findUserStub.args,
    [["a-user-id"]],
    "usersDAO findById is called with invoice user"
  );
  t.deepEqual(
    findCollectionStub.args,
    [["a-collection-id"]],
    "collectionsDAO findById is called with invoice collection"
  );
  t.deepEqual(
    findTeamStub.args,
    [[db, "a-team-id"]],
    "TeamsDAO.findById is called with collection team"
  );

  t.deepEqual(
    slackEnqueueSendStub.args,
    [
      [
        {
          channel: "designers",
          templateName: "designer_payment",
          params: {
            collection: { id: "a-collection-id", teamId: "a-team-id" },
            designer: { id: "a-user-id" },
            team: { id: "a-team-id" },
            paymentAmountCents: 2500_00,
            costOfGoodsSoldCents: 1500_00,
          },
        },
      ],
    ],
    "expected slack message is sent"
  );

  t.equal(logWarningStub.callCount, 0);
});

test("sendSlackUpdate log warning on slack service enqueue error ", async (t: Test) => {
  const { slackEnqueueSendStub, logWarningStub } = setup();
  slackEnqueueSendStub.rejects(new Error("Cannot send Slack message"));

  try {
    await sendSlackUpdate({
      invoiceId: "an-invoice-id",
      collectionId: "a-collection-id",
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
            collection: { id: "a-collection-id", teamId: "a-team-id" },
            designer: { id: "a-user-id" },
            team: { id: "a-team-id" },
            paymentAmountCents: 2500_00,
            costOfGoodsSoldCents: 1500_00,
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
