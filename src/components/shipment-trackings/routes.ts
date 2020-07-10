import Knex from "knex";
import uuid from "node-uuid";

import requireAuth = require("../../middleware/require-auth");
import {
  requireDesignIdBy,
  canAccessDesignInState,
} from "../../middleware/can-access-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";

import { ShipmentTracking } from "./types";
import * as ShipmentTrackingsDAO from "./dao";
import { requireQueryParam } from "../../middleware/require-query-param";
import { hasProperties } from "../../services/require-properties";
import { CalaRouter } from "../../services/cala-component/types";
import useTransaction from "../../middleware/use-transaction";
import Aftership from "../integrations/aftership/service";
import { attachTrackingLink } from "./service";

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

  this.body = found.map(attachTrackingLink);
  this.status = 200;
}

function* create(this: TrxContext<AuthedContext<Unsaved<ShipmentTracking>>>) {
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

  const created: ShipmentTracking = yield ShipmentTrackingsDAO.create(trx, {
    ...body,
    id: uuid.v4(),
    createdAt: new Date(),
  });

  this.status = 201;
  this.body = attachTrackingLink(created);
}

function* getCouriers(this: AuthedContext) {
  const { shipmentTrackingId } = this.request.query;

  const matchingCouriers = yield Aftership.getMatchingCouriers(
    shipmentTrackingId
  );

  this.status = 200;
  this.body = matchingCouriers;
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
  },
};

export default router;
