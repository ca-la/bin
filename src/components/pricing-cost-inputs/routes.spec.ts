import uuid from "node-uuid";
import { omit } from "lodash";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, post } from "../../test-helpers/http";
import * as PricingCostInputsDAO from "./dao";
import ProductDesignsDAO from "../product-designs/dao";
import SessionsDAO from "../../dao/sessions";
import * as ApprovalStepStateService from "../../services/approval-step-state";
import { CreatePricingCostInputRequest } from "./types";

const now = new Date();

function setup() {
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-generated-uuid");
  const sessionStub = sandbox()
    .stub(SessionsDAO, "findById")
    .resolves({ role: "ADMIN" });
  const updateTechStub = sandbox()
    .stub(ApprovalStepStateService, "updateTechnicalDesignStepForDesign")
    .resolves();
  const createStub = sandbox().stub(PricingCostInputsDAO, "create").resolves({
    id: "a-pricing-cost-input",
  });
  const findInputStub = sandbox()
    .stub(PricingCostInputsDAO, "findByDesignId")
    .resolves([
      {
        id: "a-pricing-cost-input",
      },
    ]);
  const findDesignStub = sandbox()
    .stub(ProductDesignsDAO, "findById")
    .resolves({
      id: "a-design-id",
    });

  return {
    sessionStub,
    updateTechStub,
    createStub,
    findInputStub,
    findDesignStub,
  };
}

test("POST /pricing-cost-inputs", async (t: Test) => {
  const { updateTechStub, createStub, sessionStub } = setup();

  const input: CreatePricingCostInputRequest = {
    designId: "a-design-id",
    materialBudgetCents: 12000,
    materialCategory: "STANDARD",
    minimumOrderQuantity: 200,
    needsTechnicalDesigner: true,
    processes: [
      {
        complexity: "1_COLOR",
        name: "SCREEN_PRINTING",
      },
      {
        complexity: "SMALL",
        name: "EMBROIDERY",
      },
    ],
    productComplexity: "MEDIUM",
    productType: "DRESS",
  };

  const [response, costInputs] = await post("/pricing-cost-inputs", {
    body: input,
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 201, "creates succesfully");
  t.deepEqual(
    costInputs,
    { id: "a-pricing-cost-input" },
    "returns results from calling pricing cost inputs DAO"
  );
  t.deepEqual(
    createStub.args[0][1],
    {
      createdAt: now,
      deletedAt: null,
      designId: "a-design-id",
      expiresAt: null,
      id: "a-generated-uuid",
      materialBudgetCents: 12000,
      materialCategory: "STANDARD",
      minimumOrderQuantity: 200,
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "SMALL",
          name: "EMBROIDERY",
        },
      ],
      productComplexity: "MEDIUM",
      productType: "DRESS",
    },
    "calls pricing cost inputs DAO with correct data"
  );
  t.deepEqual(
    updateTechStub.args[0].slice(1),
    ["a-design-id", true],
    "calls updating the technical design step with the correct arguments"
  );

  const [missingMoq] = await post("/pricing-cost-inputs", {
    body: omit(input, ["minimumOrderQuantity"]),
    headers: authHeader("a-session-id"),
  });
  t.equal(
    missingMoq.status,
    201,
    "creates successfully without an explicit MOQ"
  );
  t.equal(
    createStub.args[1][1].minimumOrderQuantity,
    1,
    "uses a default MOQ when none is provided"
  );

  sessionStub.resolves({ role: "USER" });

  const [unauthorized] = await post("/pricing-cost-inputs", {
    body: input,
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthorized.status, 403, "requires ADMIN role");
});

test("GET /pricing-cost-inputs?designId gets the original versions", async (t: Test) => {
  const { findInputStub, sessionStub } = setup();

  const [response, costInputs] = await get(
    "/pricing-cost-inputs?designId=a-design-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    costInputs,
    [{ id: "a-pricing-cost-input" }],
    "returns results from calling pricing cost inputs DAO"
  );
  t.deepEqual(findInputStub.args, [
    [{ designId: "a-design-id", showExpired: false }],
  ]);

  sessionStub.resolves({ role: "USER" });
  const [unauthorized] = await get(
    "/pricing-cost-inputs?designId=a-design-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(unauthorized.status, 403, "requires ADMIN role");
});

test("GET /pricing-cost-inputs?designId&showExpired can surface expired cost inputs", async (t: Test) => {
  const { findInputStub, sessionStub } = setup();

  const [response, body] = await get(
    `/pricing-cost-inputs?designId=a-design-id&showExpired=true`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, [{ id: "a-pricing-cost-input" }], "returns found inputs");
  t.deepEqual(findInputStub.args, [
    [
      {
        designId: "a-design-id",
        showExpired: true,
      },
    ],
  ]);

  sessionStub.resolves({ role: "USER" });
  const [unauthorized] = await get(
    "/pricing-cost-inputs?designId=a-design-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(unauthorized.status, 403, "requires ADMIN role");
});
