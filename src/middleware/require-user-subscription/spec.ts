import Koa from "koa";
import convert from "koa-convert";
import { test, Test, sandbox } from "../../test-helpers/fresh";

import requireUserSubscription from ".";

const promiseMiddleware = convert(requireUserSubscription as any);

const assert = (value: any, status: number, message: string) => {
  if (!value) {
    const error = new Error(message) as any;
    error.status = status;
    throw error;
  }
};

test("requireUserSubscription does not allow an unsubscribed user", async (t: Test) => {
  const ctx = ({
    request: {
      method: "POST",
    },
    state: {
      userId: "960254D3-B25A-49F6-A0A9-18314086860D",
      role: "USER",
    },
    assert,
  } as unknown) as Koa.Context;

  const nextStub = sandbox().stub();

  try {
    await promiseMiddleware(ctx, nextStub);
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err.status, 402);
    t.equal(err.message, "A subscription is required to perform this action");
  }

  t.equal(nextStub.callCount, 0);
});

test("requireUserSubscription allows admins", async (t: Test) => {
  const ctx = ({
    request: {
      method: "POST",
    },
    state: {
      userId: "960254D3-B25A-49F6-A0A9-18314086860D",
      role: "ADMIN",
    },
    assert,
  } as unknown) as Koa.Context;

  const nextStub = sandbox().stub().resolves();

  await promiseMiddleware(ctx, nextStub);
  t.equal(nextStub.callCount, 1);
});
