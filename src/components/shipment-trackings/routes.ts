import Knex from "knex";
import uuid from "node-uuid";

import requireAuth = require("../../middleware/require-auth");
import {
  requireDesignIdBy,
  canAccessDesignInState,
} from "../../middleware/can-access-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ProductDesignsDAO from "../product-designs/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as DesignEventsDAO from "../design-events/dao";
import { requireQueryParam } from "../../middleware/require-query-param";
import { hasProperties } from "../../services/require-properties";
import { CalaRouter } from "../../services/cala-component/types";
import useTransaction from "../../middleware/use-transaction";
import * as Aftership from "../integrations/aftership/service";
import { templateDesignEvent } from "../design-events/types";
import notifications from "./notifications";
import { NotificationType } from "../notifications/domain-object";

import { ShipmentTracking } from "./types";
import * as ShipmentTrackingsDAO from "./dao";
import {
  attachTrackingLink,
  attachDeliveryStatus,
  handleTrackingUpdates,
} from "./service";

const attachMeta = (shipmentTracking: ShipmentTracking) =>
  attachDeliveryStatus(attachTrackingLink(shipmentTracking));

async function getDesignIdFromStep(approvalStepId: string): Promise<string> {
  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, approvalStepId)
  );
  if (!step) {
    throw new Error(`Step not found with ID: ${approvalStepId}`);
  }

  return step.designId;
}

function* listByApprovalStepId(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { approvalStepId } = this.request.query;

  const found = yield ShipmentTrackingsDAO.find(trx, { approvalStepId });

  const withMeta = [];
  for (const tracking of found) {
    withMeta.push(yield attachMeta(tracking));
  }

  this.body = withMeta;
  this.status = 200;
}

function* create(
  this: TrxContext<
    AuthedContext<Unsaved<ShipmentTracking>, { designId: string }>
  >
) {
  const { trx } = this.state;
  const { body } = this.request;

  if (
    !hasProperties(
      body,
      "courier",
      "trackingId",
      "description",
      "approvalStepId"
    )
  ) {
    this.throw(400, "Request body does not match model");
  }
  const design = yield ProductDesignsDAO.findById(this.state.designId);

  const created: ShipmentTracking = yield ShipmentTrackingsDAO.create(trx, {
    ...body,
    id: uuid.v4(),
    createdAt: new Date(),
  });

  const collaborator = yield CollaboratorsDAO.findByDesignAndUser(
    design.id,
    design.userId
  );

  yield notifications[NotificationType.SHIPMENT_TRACKING_CREATE].send(
    trx,
    this.state.userId,
    {
      recipientUserId: design.userId,
      recipientCollaboratorId: collaborator.id,
    },
    {
      designId: design.id,
      collectionId: design.collectionIds[0] || null,
      shipmentTrackingId: created.id,
      approvalStepId: created.approvalStepId,
    }
  );
  yield DesignEventsDAO.create(trx, {
    ...templateDesignEvent,
    id: uuid.v4(),
    designId: design.id,
    approvalStepId: created.approvalStepId,
    createdAt: new Date(),
    actorId: this.state.userId,
    shipmentTrackingId: created.id,
    type: "TRACKING_CREATION",
  });

  this.status = 201;
  this.body = yield attachMeta(created);
}

function* getCouriers(this: AuthedContext) {
  const { shipmentTrackingId } = this.request.query;

  const matchingCouriers = yield Aftership.getMatchingCouriers(
    shipmentTrackingId
  );

  this.status = 200;
  this.body = matchingCouriers;
}

function* receiveShipmentTracking(this: TrxContext<PublicContext>) {
  const { trx } = this.state;
  const { aftershipToken } = this.request.query;

  this.assert(
    aftershipToken === Aftership.AFTERSHIP_SECRET_TOKEN,
    403,
    "Only Aftership webhook is allowed to POST to this endpoint"
  );

  const updates = yield Aftership.parseWebhookData(trx, this.request.body);

  yield handleTrackingUpdates(trx, updates);

  this.status = 204;
}

const router: CalaRouter = {
  prefix: "/shipment-trackings",
  routes: {
    "/": {
      get: [
        useTransaction,
        requireAuth,
        requireQueryParam("approvalStepId"),
        requireDesignIdBy(function getDesignIdFromQuery(
          this: AuthedContext
        ): Promise<string> {
          return getDesignIdFromStep(this.query.approvalStepId);
        }),
        canAccessDesignInState,
        listByApprovalStepId,
      ],
      post: [
        useTransaction,
        requireAuth,
        requireDesignIdBy(function getDesignIdFromBody(
          this: AuthedContext<Unsaved<ShipmentTracking>>
        ): Promise<string> {
          return getDesignIdFromStep(this.request.body.approvalStepId);
        }),
        canAccessDesignInState,
        create,
      ],
    },
    "/couriers": {
      get: [requireAuth, requireQueryParam("shipmentTrackingId"), getCouriers],
    },
    "/updates": {
      post: [
        useTransaction,
        requireQueryParam("aftershipToken"),
        receiveShipmentTracking,
      ],
    },
  },
};

export default router;
