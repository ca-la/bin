import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";

import { Page } from "./types";
import UserPageOnboardingsDAO from "./dao";
import { viewPage } from "./service";

function setup() {
  const testDate = new Date(2012, 11, 24);
  const clock = sandbox().useFakeTimers(testDate);

  sandbox().stub(uuid, "v4").returns("a-uuid");

  return {
    testDate,
    clock,
    trxStub: (sandbox().stub() as unknown) as Knex.Transaction,
    createStub: sandbox().stub(UserPageOnboardingsDAO, "create").resolves({
      id: "a-uuid",
      userId: "a-user-id",
      page: Page.ALL_DESIGNS,
      viewedAt: testDate,
    }),
    updateStub: sandbox().stub(UserPageOnboardingsDAO, "update").resolves({
      id: "a-uuid",
      userId: "a-user-id",
      page: Page.ALL_DESIGNS,
      viewedAt: testDate,
    }),
    findByUserAndPageStub: sandbox()
      .stub(UserPageOnboardingsDAO, "findByUserAndPage")
      .resolves({
        id: "a-uuid",
        userId: "a-user-id",
        page: Page.ALL_DESIGNS,
        viewedAt: testDate,
      }),
  };
}

test("viewPage with no existing page view", async (t: Test) => {
  const {
    testDate,
    trxStub,
    createStub,
    updateStub,
    findByUserAndPageStub,
  } = setup();

  findByUserAndPageStub.resolves(null);

  const result = await viewPage(trxStub, "a-user-id", Page.ALL_DESIGNS);

  t.deepEqual(
    createStub.args,
    [
      [
        trxStub,
        {
          id: "a-uuid",
          userId: "a-user-id",
          page: Page.ALL_DESIGNS,
          viewedAt: testDate,
        },
      ],
    ],
    "calls create"
  );
  t.deepEqual(updateStub.args, [], "does not call update");
  t.deepEqual(
    result,
    {
      id: "a-uuid",
      userId: "a-user-id",
      page: Page.ALL_DESIGNS,
      viewedAt: testDate,
    },
    "returns the created page view"
  );
});

test("viewPage with existing page view", async (t: Test) => {
  const { testDate, trxStub, createStub, updateStub } = setup();

  const result = await viewPage(trxStub, "a-user-id", Page.ALL_DESIGNS);

  t.deepEqual(createStub.args, [], "does not calls create");
  t.deepEqual(
    updateStub.args,
    [
      [
        trxStub,
        "a-uuid",
        {
          viewedAt: testDate,
        },
      ],
    ],
    "calls update"
  );
  t.deepEqual(
    result,
    {
      id: "a-uuid",
      userId: "a-user-id",
      page: Page.ALL_DESIGNS,
      viewedAt: testDate,
    },
    "returns the created page view"
  );
});
