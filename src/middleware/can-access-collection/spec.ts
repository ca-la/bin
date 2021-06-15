import Koa from "koa";
import convert from "koa-convert";
import { test, Test, sandbox } from "../../test-helpers/fresh";

import * as TeamsService from "../../components/teams/service";
import * as FindCollectionTeamPlans from "../../components/plans/find-collection-team-plans";
import { canSubmitCollection, canCheckOutCollection } from ".";

const canSubmitPromise = convert(canSubmitCollection as any);
const canCheckOutPromise = convert(canCheckOutCollection as any);

const assert = (value: any, status: number, message: string) => {
  if (!value) {
    const error = new Error(message) as any;
    error.status = status;
    throw error;
  }
};

const BASE_CONTEXT = ({
  request: {
    method: "POST",
  },
  assert,
  state: {
    collection: {
      id: "collection1",
    },
    permissions: {
      canSubmit: true,
    },
    trx: () => {
      /* noop */
    },
  },
} as unknown) as Koa.Context;

const TEAM_CONTEXT = {
  ...BASE_CONTEXT,
  state: {
    ...BASE_CONTEXT.state,
    collection: {
      id: "collection1",
      teamId: "team1",
    },
  },
};

const ADMIN_CONTEXT = {
  ...BASE_CONTEXT,
  state: {
    ...BASE_CONTEXT.state,
    role: "ADMIN",
  },
};

test("collection middleware can submit and check out team collections with appropriate privileges", async (t: Test) => {
  sandbox()
    .stub(FindCollectionTeamPlans, "canSubmitTeamCollection")
    .resolves(true);
  sandbox()
    .stub(FindCollectionTeamPlans, "canCheckOutTeamCollection")
    .resolves(true);
  const submitNextStub = sandbox().stub().resolves();
  const checkOutNextStub = sandbox().stub().resolves();

  await canSubmitPromise(TEAM_CONTEXT, submitNextStub);
  await canCheckOutPromise(TEAM_CONTEXT, checkOutNextStub);

  t.equal(submitNextStub.callCount, 1);
  t.equal(checkOutNextStub.callCount, 1);
});

test("collection middleware throws a 403 without correct permissions", async (t: Test) => {
  const nextStub = sandbox().stub().resolves();

  const ctx = {
    ...BASE_CONTEXT,
    state: {
      ...BASE_CONTEXT.state,
      permissions: {
        canSubmit: false,
      },
    },
  };

  try {
    await canSubmitPromise(ctx, nextStub);
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err.status, 403);
    t.equal(err.message, "You don't have permission to submit this collection");
  }

  t.equal(nextStub.callCount, 0);
});

test("canSubmitCollection returns a 402 without a team plan", async (t: Test) => {
  sandbox()
    .stub(FindCollectionTeamPlans, "canSubmitTeamCollection")
    .resolves(false);
  const body = { message: "can't submit" };
  sandbox()
    .stub(TeamsService, "generateUpgradeBodyDueToSubmitAttempt")
    .resolves(body);
  const nextStub = sandbox().stub().resolves();

  const teamContext = { ...TEAM_CONTEXT };
  await canSubmitPromise(teamContext, nextStub);

  t.equal(teamContext.status, 402);
  t.deepEqual(teamContext.body, body);

  t.equal(nextStub.callCount, 0);
});

test("canCheckOutCollection returns 402 without a team plan", async (t: Test) => {
  sandbox()
    .stub(FindCollectionTeamPlans, "canCheckOutTeamCollection")
    .resolves(false);
  const body = { message: "can't checkout" };
  sandbox()
    .stub(TeamsService, "generateUpgradeBodyDueToCheckoutAttempt")
    .resolves(body);
  const nextStub = sandbox().stub().resolves();

  const teamContext = { ...TEAM_CONTEXT };
  await canCheckOutPromise(teamContext, nextStub);

  t.equal(teamContext.status, 402);
  t.deepEqual(teamContext.body, body);

  t.equal(nextStub.callCount, 0);
});

test("canCheckOutCollection allows admins to checkout", async (t: Test) => {
  sandbox()
    .stub(FindCollectionTeamPlans, "canCheckOutTeamCollection")
    .resolves(false);
  const nextStub = sandbox().stub().resolves();

  await canCheckOutPromise(ADMIN_CONTEXT, nextStub);

  t.equal(nextStub.callCount, 1);
});

test("canSubmitCollection allows admins to submit", async (t: Test) => {
  sandbox()
    .stub(FindCollectionTeamPlans, "canSubmitTeamCollection")
    .resolves(false);
  const nextStub = sandbox().stub().resolves();

  await canSubmitPromise(ADMIN_CONTEXT, nextStub);

  t.equal(nextStub.callCount, 1);
});
