import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
  domain,
} from "./types";
import * as uuid from "node-uuid";
import { omit } from "lodash";
import {
  DaoUpdated,
  RouteUpdated,
  DaoUpdating,
} from "../../services/pubsub/cala-events";
import { listeners } from "./listeners";
import * as ApprovalStepStateService from "../../services/approval-step-state";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as DesignEventsDAO from "../../dao/design-events";
import * as NotificationsService from "../../services/create-notifications";

const as: ApprovalStep = {
  state: ApprovalStepState.UNSTARTED,
  id: uuid.v4(),
  title: "Checkout",
  ordering: 0,
  designId: "",
  reason: null,
  type: ApprovalStepType.CHECKOUT,
  collaboratorId: null,
  createdAt: new Date(),
  startedAt: null,
  completedAt: null,
  dueAt: null,
};

test("dao.updating", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  interface TestCase {
    title: string;
    before: ApprovalStep;
    patch: Partial<ApprovalStep>;
    updatedPatch: Partial<ApprovalStep>;
  }
  const testCases: TestCase[] = [
    {
      title: "patch doesn't have state",
      before: as,
      patch: {
        startedAt: now,
        completedAt: null,
        collaboratorId: "1",
      },
      updatedPatch: {
        startedAt: now,
        completedAt: null,
        collaboratorId: "1",
      },
    },
    {
      title: "UNSTARTED should reset startedAt and completedAt",
      before: as,
      patch: {
        state: ApprovalStepState.UNSTARTED,
      },
      updatedPatch: {
        state: ApprovalStepState.UNSTARTED,
        startedAt: null,
        completedAt: null,
      },
    },
    {
      title: "CURRENT should set startedAt and reset completedAt",
      before: as,
      patch: {
        state: ApprovalStepState.CURRENT,
      },
      updatedPatch: {
        state: ApprovalStepState.CURRENT,
        startedAt: now,
        completedAt: null,
      },
    },
    {
      title: "COMPLETED should set startedAt and completedAt",
      before: as,
      patch: {
        state: ApprovalStepState.COMPLETED,
      },
      updatedPatch: {
        state: ApprovalStepState.COMPLETED,
        startedAt: now,
        completedAt: now,
      },
    },
  ];

  const trx = await db.transaction();
  for (const testCase of testCases) {
    if (!listeners["dao.updating"]) {
      throw new Error("dao.updating listener is empty");
    }
    const event: DaoUpdating<ApprovalStep, typeof domain> = {
      type: "dao.updating",
      domain,
      trx,
      before: testCase.before,
      patch: testCase.patch,
    };
    await listeners["dao.updating"](event);
    t.deepEqual(event.patch, testCase.updatedPatch, testCase.title);
  }
  await trx.rollback();
});

test("dao.updated.state", async (t: Test) => {
  const handleStepCompletionStub = sandbox().stub(
    ApprovalStepStateService,
    "handleStepCompletion"
  );
  const now = new Date();
  sandbox().useFakeTimers(now);

  const trx = await db.transaction();
  interface TestCase {
    title: string;
    updated: ApprovalStep;
    calls: any[][];
  }
  const testCases: TestCase[] = [
    {
      title: "Update without state",
      updated: {
        ...as,
        designId: "d2",
      },
      calls: [],
    },
    {
      title: "Update with state !== COMPLETED",
      updated: {
        ...as,
        state: ApprovalStepState.BLOCKED,
        reason: "",
      },
      calls: [],
    },
    {
      title: "Update with state === COMPLETED",
      updated: {
        ...as,
        state: ApprovalStepState.COMPLETED,
        startedAt: now,
        completedAt: now,
      },
      calls: [
        [
          trx,
          {
            ...as,
            state: ApprovalStepState.COMPLETED,
            startedAt: now,
            completedAt: now,
          },
        ],
      ],
    },
  ];
  for (const testCase of testCases) {
    const event: DaoUpdated<ApprovalStep, typeof domain> = {
      trx,
      type: "dao.updated",
      domain,
      before: as,
      updated: testCase.updated,
    };
    if (!listeners["dao.updated.*"] || !listeners["dao.updated.*"].state) {
      throw new Error("dao.updated.*.state is empty");
    }

    handleStepCompletionStub.resetHistory();
    await listeners["dao.updated.*"].state(event);
    t.deepEqual(handleStepCompletionStub.args, testCase.calls, testCase.title);
  }
  await trx.rollback();
});

test("route.updated.state", async (t: Test) => {
  const handleUserStepCompletionStub = sandbox().stub(
    ApprovalStepStateService,
    "handleUserStepCompletion"
  );
  const now = new Date();
  sandbox().useFakeTimers(now);

  const trx = await db.transaction();
  interface TestCase {
    title: string;
    before: ApprovalStep;
    updated: ApprovalStep;
    calls: any[][];
  }
  const actorId = "a1";
  const testCases: TestCase[] = [
    {
      title: "Update without state",
      before: as,
      updated: {
        ...as,
        designId: "d2",
      },
      calls: [],
    },
    {
      title: "Update with state !== COMPLETED",
      before: as,
      updated: {
        ...as,
        state: ApprovalStepState.BLOCKED,
        reason: "",
      },
      calls: [],
    },
    {
      title: "Update with state === COMPLETED, but prev state !== CURRENT",
      before: {
        ...as,
        state: ApprovalStepState.BLOCKED,
        reason: "",
      },
      updated: {
        ...as,
        state: ApprovalStepState.COMPLETED,
        startedAt: now,
        completedAt: now,
      },
      calls: [],
    },
    {
      title: "Update with state === COMPLETED, and prev state === CURRENT",
      before: {
        ...as,
        startedAt: now,
        state: ApprovalStepState.CURRENT,
      },
      updated: {
        ...as,
        state: ApprovalStepState.COMPLETED,
        startedAt: now,
        completedAt: now,
      },
      calls: [
        [
          trx,
          {
            ...as,
            state: ApprovalStepState.COMPLETED,
            startedAt: now,
            completedAt: now,
          },
          actorId,
        ],
      ],
    },
  ];
  for (const testCase of testCases) {
    const event: RouteUpdated<ApprovalStep, typeof domain> = {
      type: "route.updated",
      trx,
      actorId,
      domain,
      before: testCase.before,
      updated: testCase.updated,
    };
    if (!listeners["route.updated.*"] || !listeners["route.updated.*"].state) {
      throw new Error("route.updated.*.state is empty");
    }

    handleUserStepCompletionStub.resetHistory();
    await listeners["route.updated.*"].state(event);
    t.deepEqual(
      handleUserStepCompletionStub.args,
      testCase.calls,
      testCase.title
    );
  }
  await trx.rollback();
});

test("route.updated.collaboratorId", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);

  const trx = await db.transaction();
  interface TestCase {
    title: string;
    before: ApprovalStep;
    updated: ApprovalStep;
    findCollaboratorArgs: any[][];
    findCollaboratorResult?: object;
    createDesignEventArgs: any[][];
    sendNotificationArgs: any[][];
  }
  const actorId = "a1";

  const testCases: TestCase[] = [
    {
      title: "Update without collaboratorId",
      before: as,
      updated: {
        ...as,
        designId: "d2",
      },
      findCollaboratorArgs: [],
      createDesignEventArgs: [],
      sendNotificationArgs: [],
    },
    {
      title: "Update with collaborator = null",
      before: {
        ...as,
        collaboratorId: "c2",
      },
      updated: {
        ...as,
        collaboratorId: null,
      },
      findCollaboratorArgs: [],
      createDesignEventArgs: [],
      sendNotificationArgs: [],
    },
    {
      title: "Update with collaborator not containing user",
      before: as,
      updated: {
        ...as,
        collaboratorId: "c1",
      },
      findCollaboratorArgs: [["c1"]],
      findCollaboratorResult: {},
      createDesignEventArgs: [],
      sendNotificationArgs: [],
    },
    {
      title: "Update with collaborator not found",
      before: as,
      updated: {
        ...as,
        collaboratorId: "c1",
      },
      findCollaboratorArgs: [["c1"]],
      createDesignEventArgs: [],
      sendNotificationArgs: [],
    },
    {
      title: "Update with collaborator not containing user",
      before: as,
      updated: {
        ...as,
        collaboratorId: "c1",
      },
      findCollaboratorArgs: [["c1"]],
      findCollaboratorResult: {},
      createDesignEventArgs: [],
      sendNotificationArgs: [],
    },
    {
      title: "Update with collaborator containing user",
      before: as,
      updated: {
        ...as,
        collaboratorId: "c1",
      },
      findCollaboratorArgs: [["c1"]],
      findCollaboratorResult: {
        user: { id: "u1" },
      },
      createDesignEventArgs: [
        [
          trx,
          {
            actorId,
            commentId: null,
            approvalStepId: as.id,
            approvalSubmissionId: null,
            bidId: null,
            createdAt: now,
            designId: as.designId,
            quoteId: null,
            targetId: "u1",
            taskTypeId: null,
            type: "STEP_ASSIGNMENT",
          },
        ],
      ],
      sendNotificationArgs: [
        [
          trx,
          actorId,
          {
            ...as,
            collaboratorId: "c1",
          },
        ],
      ],
    },
  ];
  for (const testCase of testCases) {
    const findCollaboratorStub = sandbox()
      .stub(CollaboratorsDAO, "findById")
      .returns(testCase.findCollaboratorResult);
    const createDesignEventStub = sandbox().stub(DesignEventsDAO, "create");
    const sendNotificationStub = sandbox().stub(
      NotificationsService,
      "sendApprovalStepAssignmentNotification"
    );

    const event: RouteUpdated<ApprovalStep, typeof domain> = {
      type: "route.updated",
      trx,
      actorId,
      domain,
      before: testCase.before,
      updated: testCase.updated,
    };
    if (
      !listeners["route.updated.*"] ||
      !listeners["route.updated.*"].collaboratorId
    ) {
      throw new Error("route.updated.*.collaboratorId is empty");
    }

    await listeners["route.updated.*"].collaboratorId(event);
    t.deepEqual(
      findCollaboratorStub.args,
      testCase.findCollaboratorArgs,
      `${testCase.title}: find collaborator`
    );
    t.deepEqual(
      createDesignEventStub.args.map((callArgs: any[]) => [
        callArgs[0],
        omit(callArgs[1], "id"),
      ]),
      testCase.createDesignEventArgs,
      `${testCase.title}: create design event`
    );
    t.deepEqual(
      sendNotificationStub.args,
      testCase.sendNotificationArgs,
      `${testCase.title}: send notification`
    );

    findCollaboratorStub.restore();
    createDesignEventStub.restore();
    sendNotificationStub.restore();
  }

  await trx.rollback();
});
