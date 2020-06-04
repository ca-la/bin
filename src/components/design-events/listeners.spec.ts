import uuid from "node-uuid";
import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/simple";
import DesignEvent, { DesignEventWithMeta, DesignEventTypes } from "./types";
import * as IrisService from "../iris/send-message";
import * as ApprovalStepStateService from "../../services/approval-step-state";

import * as DesignEventsDAO from "./dao";
import { listeners } from "./listeners";

interface Setup {
  created: DesignEvent;
  createdWithMeta: DesignEventWithMeta;
  trxStub: Knex.Transaction;
  findByIdStub: sinon.SinonStub;
  sendMessageStub: sinon.SinonStub;
  actualizeStepsStub: sinon.SinonStub;
}

function setup(eventType: DesignEventTypes): Setup {
  const created: DesignEvent = {
    actorId: uuid.v4(),
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: uuid.v4(),
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    taskTypeId: null,
    type: eventType,
  };
  const createdWithMeta: DesignEventWithMeta = {
    ...created,
    actorEmail: "anemail@example.com",
    actorName: "An Email",
    actorRole: "USER",
    stepTitle: null,
    submissionTitle: null,
    targetEmail: null,
    targetName: null,
    targetRole: null,
    taskTypeTitle: null,
  };

  const trxStub = ({} as unknown) as Knex.Transaction;
  const findByIdStub = sandbox()
    .stub(DesignEventsDAO, "findById")
    .resolves(createdWithMeta);
  const sendMessageStub = sandbox().stub(IrisService, "sendMessage").resolves();
  const actualizeStepsStub = sandbox()
    .stub(ApprovalStepStateService, "actualizeDesignStepsAfterBidAcceptance")
    .resolves();
  return {
    created,
    createdWithMeta,
    trxStub,
    findByIdStub,
    sendMessageStub,
    actualizeStepsStub,
  };
}

test("DesignEvent listener: ACCEPT_SERVICE_BID", async (t: Test) => {
  const {
    created,
    createdWithMeta,
    trxStub,
    findByIdStub,
    sendMessageStub,
    actualizeStepsStub,
  } = setup("ACCEPT_SERVICE_BID");

  await listeners["dao.created"]!({
    domain: "DesignEvent",
    type: "dao.created",
    trx: trxStub,
    created,
  });

  t.deepEqual(
    findByIdStub.args[0],
    [trxStub, created.id],
    "finds design event with meta"
  );
  t.deepEqual(
    sendMessageStub.args[0],
    [
      {
        actorId: createdWithMeta.actorId,
        approvalStepId: createdWithMeta.approvalStepId,
        resource: createdWithMeta,
        type: "design-event/created",
      },
    ],
    "sends realtime message"
  );
  t.deepEqual(
    actualizeStepsStub.args[0],
    [trxStub, created],
    "actualizes approval step state"
  );
});

test("DesignEvent listener: COMMIT_PARTNER_PAIRING", async (t: Test) => {
  const {
    created,
    createdWithMeta,
    trxStub,
    findByIdStub,
    sendMessageStub,
    actualizeStepsStub,
  } = setup("COMMIT_PARTNER_PAIRING");

  await listeners["dao.created"]!({
    domain: "DesignEvent",
    type: "dao.created",
    trx: trxStub,
    created,
  });

  t.deepEqual(
    findByIdStub.args[0],
    [trxStub, created.id],
    "finds design event with meta"
  );
  t.deepEqual(
    sendMessageStub.args[0],
    [
      {
        actorId: createdWithMeta.actorId,
        approvalStepId: createdWithMeta.approvalStepId,
        resource: createdWithMeta,
        type: "design-event/created",
      },
    ],
    "sends realtime message"
  );
  t.false(actualizeStepsStub.called, "does not actualize approval step state");
});
