import { get, put, authHeader } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import SessionsDAO from "../../dao/sessions";
import UserPageOnboardingDAO from "./dao";
import * as UserPageOnboardingService from "./service";
import { Page } from "./types";

function setup() {
  const testDate = new Date(2012, 11, 24);
  const clock = sandbox().useFakeTimers(testDate);

  return {
    testDate,
    clock,
    sessionStub: sandbox()
      .stub(SessionsDAO, "findById")
      .resolves({ userId: "a-user-id", role: "USER" }),
    findByUserStub: sandbox()
      .stub(UserPageOnboardingDAO, "findByUser")
      .resolves([
        {
          id: "a-user-page-onboarding-id",
          userId: "a-user-id",
          page: Page.ALL_DESIGNS,
          viewedAt: testDate,
        },
      ]),
    viewPageStub: sandbox()
      .stub(UserPageOnboardingService, "viewPage")
      .resolves({
        id: "a-user-page-onboarding-id",
        userId: "a-user-id",
        page: Page.ALL_DESIGNS,
        viewedAt: testDate,
      }),
  };
}

test("GET /user-page-onboardings/:userId", async (t: Test) => {
  const { testDate, sessionStub } = setup();

  const [response, body] = await get("/user-page-onboardings/a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "returns a success response");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify([
        {
          id: "a-user-page-onboarding-id",
          userId: "a-user-id",
          page: Page.ALL_DESIGNS,
          viewedAt: testDate,
        },
      ])
    ),
    "returns the list in the body"
  );

  sessionStub.resolves(null);
  const [unauthenticated] = await get("/user-page-onboardings/a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthenticated.status, 401, "returns an unauthenticated status");

  sessionStub.resolves({ userId: "a-different-user", role: "USER" });
  const [unauthorized] = await get("/user-page-onboardings/a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthorized.status, 403, "returns an unauthorized status");

  sessionStub.resolves({ userId: "a-different-user", role: "ADMIN" });
  const [adminDifferentUser, adminBody] = await get(
    "/user-page-onboardings/a-user-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(adminDifferentUser.status, 200, "returns a success response");
  t.deepEqual(
    adminBody,
    JSON.parse(
      JSON.stringify([
        {
          id: "a-user-page-onboarding-id",
          userId: "a-user-id",
          page: Page.ALL_DESIGNS,
          viewedAt: testDate,
        },
      ])
    ),
    "returns the list in the body"
  );
});

test("PUT /user-page-onboardings/:userId/:page", async (t: Test) => {
  const { testDate, sessionStub } = setup();

  const [response, body] = await put(
    `/user-page-onboardings/a-user-id/${Page.ALL_DESIGNS}`,
    {
      headers: authHeader("a-session-id"),
      body: {},
    }
  );

  t.equal(response.status, 200, "returns a success response");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        id: "a-user-page-onboarding-id",
        userId: "a-user-id",
        page: Page.ALL_DESIGNS,
        viewedAt: testDate,
      })
    ),
    "returns the UserPageOnboarding in the body"
  );

  const [invalidPage] = await put(
    "/user-page-onboardings/a-user-id/INVALID_PAGE_NAME",
    {
      headers: authHeader("a-session-id"),
      body: {},
    }
  );
  t.equal(invalidPage.status, 400, "returns an invalid data response");

  sessionStub.resolves(null);
  const [unauthenticated] = await put(
    `/user-page-onboardings/a-user-id/${Page.ALL_DESIGNS}`,
    {
      headers: authHeader("a-session-id"),
      body: {},
    }
  );

  t.equal(unauthenticated.status, 401, "returns an unauthenticated status");

  sessionStub.resolves({ userId: "a-different-user", role: "USER" });
  const [unauthorized] = await put(
    `/user-page-onboardings/a-user-id/${Page.ALL_DESIGNS}`,
    {
      headers: authHeader("a-session-id"),
      body: {},
    }
  );

  t.equal(unauthorized.status, 403, "returns an unauthorized status");

  sessionStub.resolves({ userId: "a-different-user", role: "ADMIN" });
  const [adminDifferentUser, adminBody] = await await put(
    `/user-page-onboardings/a-user-id/${Page.ALL_DESIGNS}`,
    {
      headers: authHeader("a-session-id"),
      body: {},
    }
  );

  t.equal(adminDifferentUser.status, 200, "returns a success response");
  t.deepEqual(
    adminBody,
    JSON.parse(
      JSON.stringify({
        id: "a-user-page-onboarding-id",
        userId: "a-user-id",
        page: Page.ALL_DESIGNS,
        viewedAt: testDate,
      })
    ),
    "returns the UserPageOnboarding in the body"
  );
});
