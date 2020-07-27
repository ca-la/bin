import uuid from "node-uuid";

import { test, Test, sandbox } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateBid from "../../test-helpers/factories/bid";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../../components/approval-steps/domain-object";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import { taskTypes } from "../../components/tasks/templates";
import DesignEvent, {
  templateDesignEvent,
} from "../../components/design-events/types";
import DesignEventsDAO from "../../components/design-events/dao";
import NotificationsLayer from "../../components/approval-steps/notifications";
import { NotificationType } from "../../components/notifications/domain-object";

import {
  actualizeDesignStepsAfterBidAcceptance,
  updateTechnicalDesignStepForDesign,
} from "./";

interface TestCase {
  title: string;
  taskTypeIds: string[];
  isBlank: boolean;
  stepStates: { [key in ApprovalStepType]: ApprovalStepState };
  createdDesignEvents: Partial<DesignEvent>[];
  sendNotificationCallCount: number;
}

const testCases: TestCase[] = [
  {
    title: "Technical Design bid",
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.TECHNICAL_DESIGN.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
    sendNotificationCallCount: 1,
  },
  {
    title: "Production bid",
    taskTypeIds: [taskTypes.PRODUCTION.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.PRODUCTION.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
    sendNotificationCallCount: 1,
  },
  {
    title: "Bid with Production and Technical Design tasks",
    taskTypeIds: [taskTypes.PRODUCTION.id, taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.PRODUCTION.id,
        type: "STEP_PARTNER_PAIRING",
      },
      {
        taskTypeId: taskTypes.TECHNICAL_DESIGN.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
    sendNotificationCallCount: 2,
  },
];

for (const testCase of testCases) {
  test(testCase.title, async (t: Test) => {
    const { user } = await createUser({ withSession: false });
    const design = await generateDesign({
      userId: user.id,
    });
    const { bid } = await generateBid({
      bidOptions: {
        taskTypeIds: testCase.taskTypeIds,
      },
      designId: design.id,
    });
    const createDesignEventStub = sandbox().stub(DesignEventsDAO, "create");
    const sendNotificationStub = sandbox().stub(
      NotificationsLayer[NotificationType.APPROVAL_STEP_PAIRING],
      "send"
    );
    const trx = await db.transaction();
    try {
      // Completing checkout step
      // since bid acceptance can take place only after checkout
      const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
        designId: design.id,
        type: ApprovalStepType.CHECKOUT,
      });
      await ApprovalStepsDAO.update(trx, checkoutStep!.id, {
        completedAt: new Date(),
        reason: null,
        state: ApprovalStepState.COMPLETED,
      });

      const event: DesignEvent = {
        ...templateDesignEvent,
        actorId: user.id,
        bidId: bid.id,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        type: "STEP_PARTNER_PAIRING",
      };

      await actualizeDesignStepsAfterBidAcceptance(trx, event);
      const approvalSteps: ApprovalStep[] = await ApprovalStepsDAO.findByDesign(
        trx,
        design.id
      );
      for (const approvalStep of approvalSteps) {
        t.is(
          approvalStep.state,
          testCase.stepStates[approvalStep.type],
          `${approvalStep.type} should be ${
            testCase.stepStates[approvalStep.type]
          }`
        );
      }
      const createdEvents = createDesignEventStub.args.reduce(
        (acc: Partial<DesignEvent>[], arg: any) => {
          acc.push({
            taskTypeId: arg[1].taskTypeId,
            type: arg[1].type,
          });
          return acc;
        },
        []
      );
      t.deepEqual(
        createdEvents,
        testCase.createdDesignEvents,
        `${testCase.title}: creates design events`
      );
      t.deepEqual(
        sendNotificationStub.callCount,
        testCase.sendNotificationCallCount,
        `${testCase.title}: send notification`
      );
    } finally {
      await trx.rollback();
      createDesignEventStub.restore();
    }
  });
}

test("updateTechnicalDesignStepForDesign", async (t: Test) => {
  const stepsStub = sandbox().stub(ApprovalStepsDAO, "findOne");
  const updateStub = sandbox().stub(ApprovalStepsDAO, "update");

  const trx = await db.transaction();

  try {
    stepsStub.resolves({ state: ApprovalStepState.UNSTARTED });
    await updateTechnicalDesignStepForDesign(trx, "a-design-id", false);

    t.equal(updateStub.callCount, 0, "no tech design, not blocked");
    updateStub.resetHistory();

    stepsStub.resolves({
      state: ApprovalStepState.UNSTARTED,
      id: "technical-design-step",
    });
    await updateTechnicalDesignStepForDesign(trx, "a-design-id", true);

    t.equal(
      updateStub.args[0][1],
      "technical-design-step",
      "tech design, not blocked"
    );
    t.deepEqual(
      updateStub.args[0][2],
      {
        startedAt: null,
        reason: "Awaiting partner pairing",
        state: ApprovalStepState.BLOCKED,
      },
      "tech design, not blocked"
    );
    updateStub.resetHistory();

    stepsStub.resolves({
      state: ApprovalStepState.BLOCKED,
      id: "technical-design-step",
    });
    await updateTechnicalDesignStepForDesign(trx, "a-design-id", false);

    t.equal(
      updateStub.args[0][1],
      "technical-design-step",
      "no tech design, blocked"
    );
    t.deepEqual(
      updateStub.args[0][2],
      {
        startedAt: null,
        reason: null,
        state: ApprovalStepState.UNSTARTED,
      },
      "no tech design, blocked"
    );
    updateStub.resetHistory();

    stepsStub.resolves({
      state: ApprovalStepState.BLOCKED,
      id: "technical-design-step",
    });
    await updateTechnicalDesignStepForDesign(trx, "a-design-id", true);

    t.equal(updateStub.callCount, 0, "tech design, blocked");
    updateStub.resetHistory();
  } catch (e) {
    t.fail(e);
  } finally {
    await trx.rollback();
  }
});
