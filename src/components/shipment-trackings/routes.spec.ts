import Knex from "knex";
import { authHeader, get, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import SessionsDAO from "../../dao/sessions";
import AftershipService, {
  AFTERSHIP_SECRET_TOKEN,
} from "../integrations/aftership/service";
import * as PermissionsService from "../../services/get-permissions";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as DesignEventsDAO from "../design-events/dao";
import * as ShipmentTrackingsDAO from "./dao";
import ProductDesignsDAO from "../product-designs/dao";
import { ShipmentTracking } from "./types";
import { templateDesignEvent } from "../design-events/types";
import { omit } from "lodash";

function setup() {
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role: "USER",
      userId: "a-user-id",
    }),
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
    aftershipGetStub: sandbox()
      .stub(AftershipService, "getDeliveryStatus")
      .resolves({
        tag: "Delivered",
        expectedDelivery: new Date(),
        deliveryDate: new Date(),
      }),
    findDesignStub: sandbox().stub(ProductDesignsDAO, "findById").resolves({
      id: "a-design-id",
      collectionIds: [],
    }),
    createDesignEventStub: sandbox().stub(DesignEventsDAO, "create").resolves(),
  };
}

test("GET /shipment-trackings?approvalStepId", async (t: Test) => {
  const stubs = setup();

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
      headers: authHeader("a session token"),
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
      headers: authHeader("a session token"),
    }
  );

  t.is(notPermitted.status, 403, "unauthorized response");

  stubs.stepsStub.resolves(null);

  const [stepNotFound] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader("a session token"),
    }
  );

  t.is(stepNotFound.status, 404, "step not found");

  const [missingQuery] = await get("/shipment-trackings", {
    headers: authHeader("a session token"),
  });

  t.is(missingQuery.status, 400, "missing approvalStepId query parameter");
});

test("GET /shipment-trackings/couriers?shipmentTrackingId", async (t: Test) => {
  const stubs = setup();

  const [response, body] = await get(
    "/shipment-trackings/couriers?shipmentTrackingId=a-shipment-tracking-id",
    {
      headers: authHeader("a session token"),
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
    headers: authHeader("a session token"),
  });

  t.is(missingQuery.status, 400, "missing approvalStepId query parameter");
});

test("POST /shipment-trackings", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  const stubs = setup();
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
    headers: authHeader("a session token"),
  });

  t.equal(response.status, 201, "succesful creation");
  t.deepEqual(
    body,
    {
      ...tracking,
      id: "a-shipment-tracking-id",
      createdAt: now.toISOString(),
      trackingLink: "https://track.ca.la/a-tracking-id",
      deliveryStatus: {
        tag: "Delivered",
        expectedDelivery: now.toISOString(),
        deliveryDate: now.toISOString(),
      },
    },
    "returns created tracking with all meta attached"
  );

  t.deepEqual(
    omit(stubs.createDesignEventStub.args[0][1], "id", "createdAt"),
    {
      ...templateDesignEvent,
      actorId: "a-user-id",
      approvalStepId: "an-approval-step-id",
      designId: "a-design-id",
      shipmentTrackingId: "a-shipment-tracking-id",
      type: "TRACKING_CREATION",
    },
    "creates a design event"
  );
});

test("POST /shipment-trackings/updates", async (t: Test) => {
  const [response] = await post(
    `/shipment-trackings/updates?aftershipToken=${AFTERSHIP_SECRET_TOKEN}`
  );
  t.equal(response.status, 204, "with correct token responds succesfully");

  const [missingParam] = await post("/shipment-trackings/updates");
  t.equal(
    missingParam.status,
    400,
    "aftershipToken query parameter is required"
  );

  const [wrongToken] = await post(
    "/shipment-trackings/updates?aftershipToken=wrong"
  );
  t.equal(wrongToken.status, 403, "token must match expected value");
});
