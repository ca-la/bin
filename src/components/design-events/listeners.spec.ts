import uuid from "node-uuid";
import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/simple";
import DesignEvent, {
  DesignEventWithMeta,
  DesignEventTypes,
  templateDesignEvent,
  templateDesignEventWithMeta,
} from "./types";
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
    ...templateDesignEvent,
    approvalSubmissionId: "a-submission-id",
    approvalStepId: "a-step-id",
    actorId: uuid.v4(),
    createdAt: new Date(),
    designId: uuid.v4(),
    id: uuid.v4(),
    type: eventType,
  };
  const createdWithMeta: DesignEventWithMeta = {
    ...templateDesignEventWithMeta,
    ...created,
    actorEmail: "anemail@example.com",
    actorName: "An Email",
    actorRole: "USER",
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
        channels: [
          `designs/${created.designId}`,
          `approval-steps/${created.approvalStepId}`,
          `submissions/${created.approvalSubmissionId}`,
        ],
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
        channels: [
          `designs/${created.designId}`,
          `approval-steps/${created.approvalStepId}`,
          `submissions/${created.approvalSubmissionId}`,
        ],
        resource: createdWithMeta,
        type: "design-event/created",
      },
    ],
    "sends realtime message"
  );
  t.false(actualizeStepsStub.called, "does not actualize approval step state");
});

test("DesignEvent listener: REVISION_REQUEST", async (t: Test) => {
  const { created, trxStub, sendMessageStub, actualizeStepsStub } = setup(
    "REVISION_REQUEST"
  );

  await listeners["dao.created"]!({
    domain: "DesignEvent",
    type: "dao.created",
    trx: trxStub,
    created,
  });

  t.false(sendMessageStub.called, "does not send a realtime message");
  t.false(actualizeStepsStub.called, "does not actualize approval step state");
});
