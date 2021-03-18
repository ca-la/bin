import uuid from "node-uuid";
import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role, teamUserDbTestBlank } from "../team-users/types";

import TeamsDAO from "./dao";
import { rawDao as PlansRawDAO } from "../plans/dao";
import { PlanDb } from "../plans/types";
import { TeamType, TeamDb } from "./types";
import * as TeamsService from "./service";
import { SubscriptionWithPlan } from "../subscriptions/domain-object";
import * as SubscriptionsDAO from "../subscriptions/dao";
import * as CollectionsDAO from "../collections/dao";

const testDate = new Date(2012, 11, 23);
const t1: TeamDb = {
  id: "a-team-id",
  title: "A team",
  createdAt: testDate,
  deletedAt: null,
  type: TeamType.DESIGNER,
};

test("createTeamWithOwner", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-uuid");
  const createTeamStub = sandbox().stub(TeamsDAO, "create").resolves(t1);
  const createTeamUserStub = sandbox()
    .stub(RawTeamUsersDAO, "create")
    .resolves({ ...teamUserDbTestBlank, role: Role.OWNER });

  const created = await db.transaction((trx: Knex.Transaction) =>
    TeamsService.createTeamWithOwner(trx, "A team title", "a-user-id")
  );

  t.deepEqual(
    created,
    { ...t1, role: Role.OWNER, teamUserId: teamUserDbTestBlank.id },
    "returns the created team with role"
  );
  t.deepEqual(
    createTeamStub.args[0].slice(1),
    [
      {
        id: "a-uuid",
        title: "A team title",
        createdAt: testDate,
        deletedAt: null,
        type: TeamType.DESIGNER,
      },
    ],
    "creates a team"
  );
  t.deepEqual(
    createTeamUserStub.args[0].slice(1),
    [
      {
        teamId: "a-team-id",
        userId: "a-user-id",
        userEmail: null,
        id: "a-uuid",
        role: Role.OWNER,
        label: null,
        createdAt: testDate,
        updatedAt: testDate,
        deletedAt: null,
      },
    ],
    "creates the team owner"
  );
});

test("checkCollectionsLimit", async (t: Test) => {
  interface PartialSubscription {
    plan: Partial<SubscriptionWithPlan["plan"]>;
  }
  interface TestCase {
    title: string;
    subscriptions: PartialSubscription[];
    collectionsCount: number;
    result: TeamsService.CheckLimitResult;
  }
  const testCases: TestCase[] = [
    {
      title: "no subscriptions",
      subscriptions: [],
      collectionsCount: 0,
      result: { isReached: false },
    },
    {
      title: "there's an unlimited plan",
      subscriptions: [
        { plan: { maximumCollections: 5 } },
        { plan: { maximumCollections: null } },
        { plan: { maximumCollections: 3 } },
      ],
      collectionsCount: 6,
      result: { isReached: false },
    },
    {
      title: "takes most allowing plan",
      subscriptions: [
        { plan: { maximumCollections: 5 } },
        { plan: { maximumCollections: 3 } },
      ],
      collectionsCount: 4,
      result: { isReached: false },
    },
    {
      title: "limit exceeded",
      subscriptions: [
        { plan: { maximumCollections: 5 } },
        { plan: { maximumCollections: 3 } },
      ],
      collectionsCount: 6,
      result: { isReached: true, limit: 5 },
    },
    {
      title: "limit reached",
      subscriptions: [
        { plan: { maximumCollections: 5 } },
        { plan: { maximumCollections: 3 } },
      ],
      collectionsCount: 5,
      result: { isReached: true, limit: 5 },
    },
  ];
  const findForTeamWithPlansStub = sandbox().stub(
    SubscriptionsDAO,
    "findForTeamWithPlans"
  );
  const countStub = sandbox().stub(CollectionsDAO, "count");
  for (const testCase of testCases) {
    findForTeamWithPlansStub.resolves(testCase.subscriptions);
    countStub.resolves(testCase.collectionsCount);
    t.deepEqual(
      await TeamsService.checkCollectionsLimit(db, "t1"),
      testCase.result,
      `${testCase.title}`
    );
  }
});

test("generateUpgradeBody", async (t: Test) => {
  t.deepEqual(
    TeamsService.generateUpgradeBody("t1", "Upgrade message", {
      actionText: "Go upgrade",
    }),
    {
      title: "Upgrade team",
      message: "Upgrade message",
      actionText: "Go upgrade",
      actionUrl: `/subscribe?upgradingTeamId=t1`,
    }
  );
  t.deepEqual(
    TeamsService.generateUpgradeBody("t1", "Upgrade message", {
      upgradePlan: { id: "p1" } as PlanDb,
    }),
    {
      title: "Upgrade team",
      message: "Upgrade message",
      actionText: "Upgrade team",
      actionUrl: `/subscribe?upgradingTeamId=t1&planId=p1`,
    }
  );
});

test("generateUpgradeBodyDueToCollectionsLimit", async (t: Test) => {
  interface TestCase {
    title: string;
    findPlanResult: Partial<PlanDb> | null;
    generateUpgradeBodyArgs: [string, { upgradePlan?: Partial<PlanDb> }];
  }
  const testCases: TestCase[] = [
    {
      title: "found plan",
      findPlanResult: { id: "plan-id", title: "Cool Plan" },
      generateUpgradeBodyArgs: [
        "In order to create more than 3 collections, you must first upgrade your team to Cool Plan. Upgrading includes unlimited collections, collection costing, and more.",
        {
          upgradePlan: { id: "plan-id", title: "Cool Plan" },
        },
      ],
    },
    {
      title: "found plan",
      findPlanResult: null,
      generateUpgradeBodyArgs: [
        "In order to create more than 3 collections, you must first upgrade your team.",
        {},
      ],
    },
  ];
  const findPlanStub = sandbox().stub(PlansRawDAO, "findOne");

  const generateBodyStub = sandbox().stub(TeamsService, "generateUpgradeBody");

  for (const testCase of testCases) {
    findPlanStub.resolves(testCase.findPlanResult);
    generateBodyStub.resetHistory();
    await TeamsService.generateUpgradeBodyDueToCollectionsLimit(db, "t1", 3);

    t.deepEqual(
      generateBodyStub.args[0].slice(1),
      testCase.generateUpgradeBodyArgs,
      testCase.title
    );
  }
});

test("generateUpgradeBodyDueToUsersLimit", async (t: Test) => {
  interface TestCase {
    title: string;
    findPlanResult: Partial<PlanDb> | null;
    generateUpgradeBodyArgs: [string, { upgradePlan?: Partial<PlanDb> }];
  }
  const testCases: TestCase[] = [
    {
      title: "found plan",
      findPlanResult: { id: "plan-id", title: "Cool Plan" },
      generateUpgradeBodyArgs: [
        "In order to add additional EDITOR seats, you must first upgrade your team. Upgrading includes unlimited collections, collection costing, and more.",
        {
          upgradePlan: { id: "plan-id", title: "Cool Plan" },
        },
      ],
    },
    {
      title: "found plan",
      findPlanResult: null,
      generateUpgradeBodyArgs: [
        "In order to add additional EDITOR seats, you must first upgrade your team. Upgrading includes unlimited collections, collection costing, and more.",
        {},
      ],
    },
  ];
  const findPlanStub = sandbox().stub(PlansRawDAO, "findOne");

  const generateBodyStub = sandbox().stub(TeamsService, "generateUpgradeBody");

  for (const testCase of testCases) {
    findPlanStub.resolves(testCase.findPlanResult);
    generateBodyStub.resetHistory();
    await TeamsService.generateUpgradeBodyDueToUsersLimit(
      db,
      "t1",
      Role.EDITOR
    );

    t.deepEqual(
      generateBodyStub.args[0].slice(1),
      testCase.generateUpgradeBodyArgs,
      testCase.title
    );
  }
});

test("generateUpgradeBodyDueToSubmitAttempt", async (t: Test) => {
  interface TestCase {
    title: string;
    findPlanResult: Partial<PlanDb> | null;
    generateUpgradeBodyArgs: [string, { upgradePlan?: Partial<PlanDb> }];
  }
  const testCases: TestCase[] = [
    {
      title: "found plan",
      findPlanResult: { id: "plan-id", title: "Cool Plan" },
      generateUpgradeBodyArgs: [
        "In order to submit the collection, you must first upgrade your team to Cool Plan.",
        {
          upgradePlan: { id: "plan-id", title: "Cool Plan" },
        },
      ],
    },
    {
      title: "found plan",
      findPlanResult: null,
      generateUpgradeBodyArgs: [
        "In order to submit the collection, you must first upgrade your team.",
        {},
      ],
    },
  ];
  const findPlanStub = sandbox().stub(PlansRawDAO, "findOne");

  const generateBodyStub = sandbox().stub(TeamsService, "generateUpgradeBody");

  for (const testCase of testCases) {
    findPlanStub.resolves(testCase.findPlanResult);
    generateBodyStub.resetHistory();
    await TeamsService.generateUpgradeBodyDueToSubmitAttempt(db, "t1");

    t.deepEqual(
      generateBodyStub.args[0].slice(1),
      testCase.generateUpgradeBodyArgs,
      testCase.title
    );
  }
});

test("generateUpgradeBodyDueToCheckoutAttempt", async (t: Test) => {
  interface TestCase {
    title: string;
    findPlanResult: Partial<PlanDb> | null;
    generateUpgradeBodyArgs: [string, { upgradePlan?: Partial<PlanDb> }];
  }
  const testCases: TestCase[] = [
    {
      title: "found plan",
      findPlanResult: { id: "plan-id", title: "Cool Plan" },
      generateUpgradeBodyArgs: [
        "In order to check out the collection, you must first upgrade your team to Cool Plan.",
        {
          upgradePlan: { id: "plan-id", title: "Cool Plan" },
        },
      ],
    },
    {
      title: "found plan",
      findPlanResult: null,
      generateUpgradeBodyArgs: [
        "In order to check out the collection, you must first upgrade your team.",
        {},
      ],
    },
  ];
  const findPlanStub = sandbox().stub(PlansRawDAO, "findOne");

  const generateBodyStub = sandbox().stub(TeamsService, "generateUpgradeBody");

  for (const testCase of testCases) {
    findPlanStub.resolves(testCase.findPlanResult);
    generateBodyStub.resetHistory();
    await TeamsService.generateUpgradeBodyDueToCheckoutAttempt(db, "t1");

    t.deepEqual(
      generateBodyStub.args[0].slice(1),
      testCase.generateUpgradeBodyArgs,
      testCase.title
    );
  }
});
