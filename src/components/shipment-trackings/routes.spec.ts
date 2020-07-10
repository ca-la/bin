import Knex from "knex";
import createUser from "../../test-helpers/create-user";
import { authHeader, get, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import AftershipService from "../integrations/aftership/service";
import * as PermissionsService from "../../services/get-permissions";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as ShipmentTrackingsDAO from "./dao";
import { ShipmentTracking } from "./types";

async function setup() {
  const designer = await createUser();

  return {
    users: {
      designer,
    },
    stubs: {
      stepsStub: sandbox().stub(ApprovalStepsDAO, "findById").resolves({
        id: "an-approval-step-id",
        designId: "a-design-id",
      }),
      findStub: sandbox().stub(ShipmentTrackingsDAO, "find"),
      createStub: sandbox().stub(ShipmentTrackingsDAO, "create"),
      permissionsStub: sandbox()
        .stub(PermissionsService, "getDesignPermissions")
        .resolves({
          canComment: true,
          canDelete: true,
          canEdit: true,
          canEditVariants: false,
          canSubmit: true,
          canView: true,
        }),
      aftershipCouriersStub: sandbox()
        .stub(AftershipService, "getMatchingCouriers")
        .resolves([{ slug: "usps", name: "United States Postal Service" }]),
    },
  };
}

test("GET /shipment-trackings?approvalStepId", async (t: Test) => {
  const {
    users: { designer },
    stubs,
  } = await setup();

  stubs.findStub.resolves([
    {
      id: "a-shipment-tracking-id",
      courier: "usps",
      trackingId: "aTRACKINGid",
      description: null,
      approvalStepId: "an approval step id",
      createdAt: new Date(),
    },
    {
      id: "another-shipment-tracking-id",
      courier: "usps",
      trackingId: "anotherTRACKINGid",
      description: null,
      approvalStepId: "an-approval-step-id",
      createdAt: new Date(),
    },
  ]);

  const [response, body] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(response.status, 200, "successful response");
  t.is(body.length, 2, "returns relevant trackings");

  stubs.permissionsStub.resolves({
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditVariants: false,
    canSubmit: false,
    canView: false,
  });

  const [notPermitted] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(notPermitted.status, 403, "unauthorized response");

  stubs.stepsStub.resolves(null);

  const [stepNotFound] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(stepNotFound.status, 404, "step not found");

  const [missingQuery] = await get("/shipment-trackings", {
    headers: authHeader(designer.session.id),
  });

  t.is(missingQuery.status, 400, "missing approvalStepId query parameter");
});

test("GET /shipment-trackings/couriers?shipmentTrackingId", async (t: Test) => {
  const {
    users: { designer },
    stubs,
  } = await setup();

  const [response, body] = await get(
    "/shipment-trackings/couriers?shipmentTrackingId=a-shipment-tracking-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(response.status, 200, "successful response");
  t.deepEqual(
    body,
    [{ slug: "usps", name: "United States Postal Service" }],
    "returns couriers"
  );
  t.deepEqual(
    stubs.aftershipCouriersStub.args,
    [["a-shipment-tracking-id"]],
    "calls service with tracking ID"
  );

  const [missingQuery] = await get("/shipment-trackings/couriers", {
    headers: authHeader(designer.session.id),
  });

  t.is(missingQuery.status, 400, "missing approvalStepId query parameter");
});

test("POST /shipment-trackings", async (t: Test) => {
  const {
    users: { designer },
    stubs,
  } = await setup();
  const now = new Date();
  const tracking: Unsaved<ShipmentTracking> = {
    courier: "usps",
    trackingId: "a-tracking-id",
    description: null,
    approvalStepId: "an-approval-step-id",
  };

  stubs.createStub.callsFake(
    async (_: Knex.Transaction, data: Unsaved<ShipmentTracking>) => ({
      ...data,
      id: "a-shipment-tracking-id",
      createdAt: now,
    })
  );

  const [response, body] = await post("/shipment-trackings", {
    body: tracking,
    headers: authHeader(designer.session.id),
  });

  t.equal(response.status, 201, "succesful creation");
  t.deepEqual(
    body,
    {
      ...tracking,
      id: "a-shipment-tracking-id",
      createdAt: now.toISOString(),
      trackingLink: "https://cala.aftership.com/a-tracking-id",
    },
    "returns created tracking with link, id, and date"
  );
});
