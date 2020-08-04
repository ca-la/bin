import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import { authHeader, get, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import SessionsDAO from "../../dao/sessions";
import * as AftershipService from "../integrations/aftership/service";
import db from "../../services/db";
import * as PermissionsService from "../../services/get-permissions";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ProductDesignsDAO from "../product-designs/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as DesignEventsDAO from "../design-events/dao";
import * as ShipmentTrackingsDAO from "./dao";
import { ShipmentTracking } from "./types";
import NotificationsLayer from "./notifications";
import { NotificationType } from "../notifications/domain-object";
import { templateDesignEvent } from "../design-events/types";
import ShipmentTrackingEventService from "../shipment-tracking-events/service";
import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import createUser from "../../test-helpers/create-user";
import createDesign from "../../services/create-design";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import { ApprovalStepType } from "../approval-steps/types";
import * as AftershipTrackingsDAO from "../aftership-trackings/dao";

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
    findCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "findByDesignAndUser")
      .resolves({ id: "a-collabo-id" }),
    notificationsSendStub: sandbox()
      .stub(
        NotificationsLayer[NotificationType.SHIPMENT_TRACKING_CREATE],
        "send"
      )
      .resolves(),
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
    deliveryDate: null,
    expectedDelivery: null,
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
  t.equal(stubs.notificationsSendStub.callCount, 1, "creates a notification");
});

test("POST /shipment-trackings/updates", async (t: Test) => {
  sandbox()
    .stub(AftershipService, "parseWebhookData")
    .resolves([
      {
        events: [],
        shipmentTrackingId: "a-shipment-tracking-id",
      },
    ]);
  sandbox().stub(ShipmentTrackingsDAO, "update").resolves();
  sandbox().stub(ShipmentTrackingEventService, "diff").resolves([]);
  sandbox().stub(ShipmentTrackingEventsDAO, "createAll").resolves([]);
  const [response] = await post(
    `/shipment-trackings/updates?aftershipToken=${AftershipService.AFTERSHIP_SECRET_TOKEN}`
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

test("POST /shipment-trackings/updates end-to-end", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const e1 = {
    id: uuid.v4(),
    country: null,
    courier: "usps",
    courierTag: null,
    courierTimestamp: "2012-12-23",
    createdAt: new Date(2012, 11, 23),
    location: null,
    message: null,
    subtag: "Pending_001",
    tag: "Pending",
  };
  const e2 = {
    country: null,
    courier: "usps",
    courierTag: null,
    courierTimestamp: "2012-12-25",
    createdAt: new Date(2012, 11, 25),
    location: null,
    message: null,
    subtag: "InTransit_003",
    tag: "InTransit",
  };

  const { shipmentTracking, aftershipTracking } = await db.transaction(
    async (trx: Knex.Transaction) => {
      const d1 = await createDesign(
        staticProductDesign({ id: "d1", userId: user.id }),
        trx
      );
      const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
        designId: d1.id,
        type: ApprovalStepType.CHECKOUT,
      });

      if (!checkoutStep) {
        throw new Error("Could not find checkout step for created design");
      }

      const shipmentTrackingId = uuid.v4();

      sandbox()
        .stub(AftershipService, "createTracking")
        .resolves({
          aftershipTracking: {},
          updates: [
            {
              shipmentTrackingId,
              expectedDelivery: null,
              deliveryDate: null,
              events: [],
            },
          ],
        });

      const tracking = await ShipmentTrackingsDAO.create(trx, {
        approvalStepId: checkoutStep.id,
        courier: "usps",
        createdAt: new Date(2012, 11, 23),
        description: "First",
        id: shipmentTrackingId,
        trackingId: "first-tracking-id",
        deliveryDate: null,
        expectedDelivery: null,
      });

      await ShipmentTrackingEventsDAO.createAll(trx, [
        { ...e1, shipmentTrackingId: tracking.id },
      ]);

      return {
        shipmentTracking: tracking,
        aftershipTracking: await AftershipTrackingsDAO.create(trx, {
          createdAt: new Date(2012, 11, 23),
          id: uuid.v4(),
          shipmentTrackingId: tracking.id,
        }),
      };
    }
  );

  await post(
    `/shipment-trackings/updates?aftershipToken=${AftershipService.AFTERSHIP_SECRET_TOKEN}`,
    {
      body: {
        msg: {
          id: aftershipTracking.id,
          tracking_number: "a-courier-tracking-number",
          tag: "InTransit",
          expected_delivery: null,
          checkpoints: [
            {
              created_at: new Date(2012, 11, 23),
              slug: "usps",
              tag: "Pending",
              subtag: "Pending_001",
              checkpoint_time: "2012-12-23",
            },
            {
              created_at: new Date(2012, 11, 25),
              slug: "usps",
              tag: "InTransit",
              subtag: "InTransit_003",
              checkpoint_time: "2012-12-25",
            },
          ],
        },
      },
    }
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    const all = await ShipmentTrackingEventsDAO.find(trx, {
      shipmentTrackingId: shipmentTracking.id,
    });
    t.deepEqual(
      all,
      [
        {
          ...e1,
          shipmentTrackingId: shipmentTracking.id,
          courierTimestamp: new Date(2012, 11, 23),
        },
        {
          ...e2,
          shipmentTrackingId: shipmentTracking.id,
          id: all[1].id,
          courierTimestamp: new Date(2012, 11, 25),
        },
      ],
      "adds new event with an id"
    );
    const latest = await ShipmentTrackingEventsDAO.findLatestByShipmentTracking(
      trx,
      shipmentTracking.id
    );
    t.deepEqual(
      latest,
      {
        ...e2,
        id: latest!.id,
        shipmentTrackingId: shipmentTracking.id,
        courierTimestamp: new Date(2012, 11, 25),
      },
      "new event is now the latest event"
    );
  });

  await post(
    `/shipment-trackings/updates?aftershipToken=${AftershipService.AFTERSHIP_SECRET_TOKEN}`,
    {
      body: {
        msg: {
          id: aftershipTracking.id,
          tracking_number: "a-courier-tracking-number",
          tag: "InTransit",
          expected_delivery: new Date(2012, 11, 27),
          checkpoints: [
            {
              created_at: new Date(2012, 11, 23),
              slug: "usps",
              tag: "Pending",
              subtag: "Pending_001",
            },
            {
              created_at: new Date(2012, 11, 25),
              slug: "usps",
              tag: "InTransit",
              subtag: "InTransit_003",
            },
          ],
        },
      },
    }
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    const all = await ShipmentTrackingEventsDAO.find(trx, {
      shipmentTrackingId: shipmentTracking.id,
    });
    t.deepEqual(
      all,
      [
        {
          ...e1,
          shipmentTrackingId: shipmentTracking.id,
          courierTimestamp: new Date(2012, 11, 23),
        },
        {
          ...e2,
          shipmentTrackingId: shipmentTracking.id,
          id: all[1].id,
          courierTimestamp: new Date(2012, 11, 25),
        },
      ],
      "does not add any new events if same checkpoints come in the update"
    );
  });
});
