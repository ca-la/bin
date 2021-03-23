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
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import NotificationsLayer from "./notifications";
import { NotificationType } from "../notifications/domain-object";
import * as NotificationsService from "../notifications/service";
import { templateDesignEvent } from "../design-events/types";
import * as ShipmentTrackingEventService from "../shipment-tracking-events/service";
import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import createUser from "../../test-helpers/create-user";
import createDesign from "../../services/create-design";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import { ApprovalStepType } from "../approval-steps/types";
import * as AftershipTrackingsDAO from "../aftership-trackings/dao";
import * as SlackService from "../../services/slack";
import { STUDIO_HOST, CALA_OPS_USER_ID } from "../../config";

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
    getRecipientsByDesignStub: sandbox()
      .stub(NotificationsService, "getRecipientsByDesign")
      .resolves([]),
    aftershipCouriersStub: sandbox()
      .stub(AftershipService, "getMatchingCouriers")
      .resolves([{ slug: "usps", name: "United States Postal Service" }]),
    aftershipTrackingStub: sandbox().stub(AftershipService, "getTracking"),
    findDesignStub: sandbox().stub(ProductDesignsDAO, "findById").resolves({
      id: "a-design-id",
      collectionIds: [],
    }),
    createDesignEventStub: sandbox().stub(DesignEventsDAO, "create").resolves(),
    trackingEventsStub: sandbox().stub(
      ShipmentTrackingEventsDAO,
      "findLatestByShipmentTracking"
    ),
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
  stubs.aftershipTrackingStub.resolves({
    tracking: {
      tracking_number: "a-shipment-tracking-id",
      id: "an-aftership-tracking-id",
      tag: "Delivered",
      expected_delivery: "2012-12-23T00:00:00Z",
      shipment_delivery_date: "2012-12-23T00:00:00Z",
      checkpoints: [
        {
          created_at: "2012-12-22T00:00:00Z",
          slug: "usps",
          tag: "Delivered",
          subtag: "Delivered_001",
          checkpoint_time: "2012-12-23T00:00",
        },
      ],
    },
  });

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
    deliveryDate: now,
    expectedDelivery: now,
  };

  stubs.createStub.callsFake(
    async (_: Knex.Transaction, data: Unsaved<ShipmentTracking>) => ({
      ...data,
      id: "a-shipment-tracking-id",
      createdAt: now,
    })
  );
  stubs.aftershipTrackingStub.resolves({
    tracking: {
      tracking_number: "a-shipment-tracking-id",
      id: "an-aftership-tracking-id",
      tag: "Delivered",
      expected_delivery: now.toISOString(),
      shipment_delivery_date: now.toISOString(),
      checkpoints: [
        {
          created_at: "2012-12-22T00:00:00Z",
          slug: "usps",
          tag: "Delivered",
          subtag: "Delivered_001",
          checkpoint_time: "2012-12-23T00:00",
        },
      ],
    },
  });

  const recipientsList = [
    {
      recipientUserId: "a-user-id-1",
      recipientCollaboratorId: null,
      recipientTeamUserId: "a-team-user-id",
    },
    {
      recipientUserId: "a-user-id-2",
      recipientCollaboratorId: "a-collaborator-id",
      recipientTeamUserId: null,
    },
  ];
  stubs.getRecipientsByDesignStub.resolves(recipientsList);

  const [response, body] = await post("/shipment-trackings", {
    body: tracking,
    headers: authHeader("a session token"),
  });

  t.equal(response.status, 201, "succesful creation");
  t.deepEqual(
    body,
    {
      ...tracking,
      deliveryDate: now.toISOString(),
      expectedDelivery: now.toISOString(),
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

  t.equal(stubs.getRecipientsByDesignStub.callCount, 1, "get recipients lsit");
  t.deepEqual(
    stubs.getRecipientsByDesignStub.args[0].slice(1),
    ["a-design-id"],
    "get recipients has been called with correct design id"
  );
  t.equal(
    stubs.notificationsSendStub.callCount,
    2,
    "creates two notifications according to number of recipients"
  );

  t.deepEqual(
    stubs.notificationsSendStub.args[0][2],
    recipientsList[0],
    "creates first notification with provided recipient"
  );
  t.deepEqual(
    stubs.notificationsSendStub.args[1][2],
    recipientsList[1],
    "creates second notification with provided recipient"
  );
});

test("POST /shipment-trackings with no collaborator", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  const stubs = setup();
  stubs.findCollaboratorStub.resolves(null);

  const tracking: Unsaved<ShipmentTracking> = {
    courier: "usps",
    trackingId: "a-tracking-id",
    description: null,
    approvalStepId: "an-approval-step-id",
    deliveryDate: now,
    expectedDelivery: now,
  };

  stubs.createStub.callsFake(
    async (_: Knex.Transaction, data: Unsaved<ShipmentTracking>) => ({
      ...data,
      id: "a-shipment-tracking-id",
      createdAt: now,
    })
  );

  stubs.aftershipTrackingStub.resolves({
    tracking: {
      tracking_number: "a-shipment-tracking-id",
      id: "an-aftership-tracking-id",
      tag: "Delivered",
      expected_delivery: now.toISOString(),
      shipment_delivery_date: now.toISOString(),
      checkpoints: [
        {
          created_at: "2012-12-22T00:00:00Z",
          slug: "usps",
          tag: "Delivered",
          subtag: "Delivered_001",
          checkpoint_time: "2012-12-23T00:00",
        },
      ],
    },
  });

  const [response] = await post("/shipment-trackings", {
    body: tracking,
    headers: authHeader("a session token"),
  });

  t.equal(response.status, 201, "succesful creation");
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
  sandbox().stub(ShipmentTrackingsDAO, "update").resolves({ updated: {} });
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
    courierTimestamp: new Date(2012, 11, 23),
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
    courierTimestamp: new Date(2012, 11, 25),
    createdAt: new Date(2012, 11, 23),
    location: null,
    message: null,
    subtag: "InTransit_003",
    tag: "InTransit",
  };
  const e3 = {
    country: null,
    courier: "usps",
    courierTag: null,
    courierTimestamp: new Date(2012, 11, 27),
    createdAt: new Date(2012, 11, 27),
    location: null,
    message: null,
    subtag: "AttemptFail_001",
    tag: "AttemptFail",
  };
  const notificationSendStub = sandbox()
    .stub(NotificationsLayer[NotificationType.SHIPMENT_TRACKING_UPDATE], "send")
    .resolves();
  const createDesignEventStub = sandbox()
    .stub(DesignEventsDAO, "create")
    .resolves();

  const {
    shipmentTracking,
    aftershipTracking,
    design,
    approvalStep,
  } = await db.transaction(async (trx: Knex.Transaction) => {
    const d1 = await createDesign(
      staticProductDesign({
        id: "d1",
        userId: user.id,
        title: "A design title",
      }),
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

    sandbox()
      .stub(AftershipService, "getTracking")
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
      { ...e1, shipmentTrackingId: tracking.id } as ShipmentTrackingEvent,
    ]);

    return {
      shipmentTracking: tracking,
      aftershipTracking: await AftershipTrackingsDAO.create(trx, {
        createdAt: new Date(2012, 11, 23),
        id: uuid.v4(),
        shipmentTrackingId: tracking.id,
      }),
      design: d1,
      approvalStep: checkoutStep,
    };
  });

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
              checkpoint_time: "2012-12-23T00:00",
            },
            {
              created_at: new Date(2012, 11, 23),
              slug: "usps",
              tag: "InTransit",
              subtag: "InTransit_003",
              checkpoint_time: "2012-12-25T00:00",
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
        },
        {
          ...e2,
          shipmentTrackingId: shipmentTracking.id,
          id: all[1].id,
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
      },
      "new event is now the latest event"
    );
    t.is(notificationSendStub.callCount, 1, "Creates a notification");
    t.is(
      notificationSendStub.args[0][2].recipientUserId,
      user.id,
      "Sends it to the designer"
    );
    t.deepEqual(
      notificationSendStub.args[0][3],
      {
        approvalStepId: approvalStep.id,
        designId: design.id,
        collectionId: null,
        shipmentTrackingId: shipmentTracking.id,
        shipmentTrackingEventId: latest!.id,
      },
      "Creates a notification with the correct arguments"
    );
    t.deepEqual(
      omit(createDesignEventStub.args[0][1], "id", "createdAt"),
      {
        ...templateDesignEvent,
        designId: design.id,
        approvalStepId: shipmentTracking.approvalStepId,
        actorId: CALA_OPS_USER_ID,
        shipmentTrackingId: shipmentTracking.id,
        shipmentTrackingEventId: latest!.id,
        type: "TRACKING_UPDATE",
      },
      "Creates an event with the correct arguments"
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
              checkpoint_time: "2012-12-23T00:00",
            },
            {
              created_at: new Date(2012, 11, 25),
              slug: "usps",
              tag: "InTransit",
              subtag: "InTransit_003",
              checkpoint_time: "2012-12-25T00:00",
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

  const slackStub = sandbox().stub(SlackService, "enqueueSend").resolves();
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
              checkpoint_time: "2012-12-23T00:00",
            },
            {
              created_at: new Date(2012, 11, 25),
              slug: "usps",
              tag: "InTransit",
              subtag: "InTransit_003",
              checkpoint_time: "2012-12-25T00:00",
            },
            {
              created_at: new Date(2012, 11, 27),
              slug: "usps",
              tag: "AttemptFail",
              subtag: "AttemptFail_001",
              checkpoint_time: "2012-12-27T00:00",
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
        },
        {
          ...e2,
          shipmentTrackingId: shipmentTracking.id,
          id: all[1].id,
        },
        {
          ...e3,
          shipmentTrackingId: shipmentTracking.id,
          id: all[2].id,
        },
      ],
      "Adds new event"
    );

    t.deepEqual(
      slackStub.args,
      [
        [
          {
            channel: "shipment-tracking",
            params: {
              designTitle: design.title,
              designerName: user.name,
              message: null,
              designLink: `${STUDIO_HOST}/dashboard?designId=${design.id}&stepId=${approvalStep.id}&showTracking=view&trackingId=${shipmentTracking.id}`,
              trackingLink: "https://track.ca.la/first-tracking-id",
              trackingDescription: shipmentTracking.description,
            },
            templateName: "shipment_exception",
          },
        ],
      ],
      "sends a Slack message on exception or failed attempt"
    );
  });
});

test("POST /shipment-trackings/updates tracking not found", async (t: Test) => {
  const notificationSendStub = sandbox()
    .stub(NotificationsLayer[NotificationType.SHIPMENT_TRACKING_UPDATE], "send")
    .resolves();
  const createDesignEventStub = sandbox()
    .stub(DesignEventsDAO, "create")
    .resolves();

  const [response] = await post(
    `/shipment-trackings/updates?aftershipToken=${AftershipService.AFTERSHIP_SECRET_TOKEN}`,
    {
      body: {
        msg: {
          id: "an-unknown-id",
          tracking_number: "a-courier-tracking-number",
          tag: "InTransit",
          expected_delivery: null,
          checkpoints: [
            {
              created_at: new Date(2012, 11, 23),
              slug: "usps",
              tag: "Pending",
              subtag: "Pending_001",
              checkpoint_time: "2012-12-23T00:00",
            },
          ],
        },
      },
    }
  );
  t.is(
    response.status,
    204,
    "Does not return an error status when nothing is found"
  );
  t.is(notificationSendStub.callCount, 0, "Does not create any notifications");
  t.is(createDesignEventStub.callCount, 0, "Does not create any events");
});
