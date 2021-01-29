import { sandbox, test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";
import { Test } from "tape";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";
import ApprovalStepsDAO from "./dao";
import Logger = require("../../services/logger");

test("FindApprovalSteps endpoint", async (t: Test) => {
  interface Variables {
    limit: any;
    offset: any;
    filter: any;
  }

  const designer = await createUser({});
  const admin = await createUser({ role: "ADMIN" });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });

  // Generate unrelated design to make sure filtering works
  await generateDesign({ userId: other.user.id });

  function buildRequest(variables: Partial<Variables>) {
    return {
      operationName: "n",
      query: `query n($limit: Int, $offset: Int, $filter: ApprovalStepFilter) {
        FindApprovalSteps(limit: $limit, offset: $offset, filter: $filter) {
          list {
            title
          }
          meta {
            total
          }
        }
      }`,
      variables,
    };
  }

  interface TestCase {
    title: string;
    variables?: Partial<Variables>;
    data?: any;
    error?: string;
    sessionId?: string;
  }

  const testCases: TestCase[] = [
    {
      title: "Fails on unauthenticated request",
      error: "Unauthorized",
    },
    {
      title: "Fails if filter doesn't have designId",
      error: "Filter should contain designId",
      sessionId: other.session.id,
    },
    {
      title: "Fails for unrelated user",
      error: "Not authorized to view this design",
      sessionId: other.session.id,
      variables: {
        filter: { designId: d1.id },
      },
    },
    {
      title: "Works for admin",
      data: {
        list: [
          { title: "Checkout" },
          { title: "Technical Design" },
          { title: "Sample" },
          { title: "Production" },
        ],
        meta: { total: 4 },
      },
      sessionId: admin.session.id,
      variables: {
        filter: { designId: d1.id },
      },
    },
    {
      title: "Works for owner",
      data: {
        list: [
          { title: "Checkout" },
          { title: "Technical Design" },
          { title: "Sample" },
          { title: "Production" },
        ],
        meta: { total: 4 },
      },
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
      },
    },
    {
      title: "Respects limit",
      data: {
        list: [{ title: "Checkout" }, { title: "Technical Design" }],
        meta: { total: 4 },
      },
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
        limit: 2,
      },
    },
    {
      title: "Respects zero limit",
      data: {
        list: [],
        meta: { total: 4 },
      },
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
        limit: 0,
      },
    },
    {
      title: "Fails on negative limit",
      error: "Offset / Limit cannot be negative!",
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
        limit: -1,
      },
    },
    {
      title: "Respects offset",
      data: {
        list: [{ title: "Sample" }, { title: "Production" }],
        meta: { total: 4 },
      },
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
        offset: 2,
      },
    },
    {
      title: "Fails on negative offset",
      error: "Offset / Limit cannot be negative!",
      sessionId: designer.session.id,
      variables: {
        filter: { designId: d1.id },
        offset: -1,
      },
    },
  ];

  const logServerErrorStub = sandbox().stub(Logger, "logServerError");
  for (const testCase of testCases) {
    logServerErrorStub.reset();
    const [, body] = await post("/v2", {
      body: buildRequest(testCase.variables || {}),
      headers: testCase.sessionId ? authHeader(testCase.sessionId) : {},
    });
    if (testCase.data) {
      t.deepEqual(body.data.FindApprovalSteps, testCase.data, testCase.title);
    } else {
      t.equal(
        body.errors[0].message,
        "Something went wrong! Please try again, or email hi@ca.la if this message persists."
      );
      t.equal(
        logServerErrorStub.args[0][0].message,
        testCase.error,
        testCase.title
      );
    }
  }

  const countStub = sandbox().stub(ApprovalStepsDAO, "count").resolves(1);
  const [, noTotalBody] = await post("/v2", {
    body: {
      operationName: "n",
      query: `query n($limit: Int, $offset: Int, $filter: ApprovalStepFilter) {
        FindApprovalSteps(limit: $limit, offset: $offset, filter: $filter) {
          list {
            title
          }
        }
      }`,
      variables: {
        filter: { designId: d1.id },
      },
    },
    headers: authHeader(admin.session.id),
  });
  t.notOk(noTotalBody.errors);
  t.deepEqual(countStub.args, []);
});
