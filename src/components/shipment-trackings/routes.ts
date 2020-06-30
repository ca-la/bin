import Knex from "knex";
import uuid from "node-uuid";
import { buildRouter } from "../../services/cala-component/cala-router";
import requireAuth = require("../../middleware/require-auth");
import {
  requireDesignIdBy,
  canAccessDesignInState,
} from "../../middleware/can-access-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";

import { ShipmentTracking, domain } from "./types";
import * as ShipmentTrackingsDAO from "./dao";
import { requireQueryParam } from "../../middleware/require-query-param";
import { hasProperties } from "../../services/require-properties";
import { CalaRouter } from "../../services/cala-component/types";
import useTransaction from "../../middleware/use-transaction";
import { buildTrackingLink } from "./service";

async function getDesignIdFromStep(approvalStepId: string): Promise<string> {
  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, approvalStepId)
  );
  if (!step) {
    throw new Error(`Step not found with ID: ${approvalStepId}`);
  }

  return step.designId;
}

const { prefix, routes } = buildRouter<ShipmentTracking>(
  domain,
  "/shipment-trackings",
  ShipmentTrackingsDAO,
  {
    pickRoutes: ["find"],
    routeOptions: {
      find: {
        allowedFilterAttributes: [
          "approvalStepId",
        ] as (keyof ShipmentTracking)[],
        middleware: [
          requireAuth,
          requireQueryParam("approvalStepId"),
          requireDesignIdBy(function getDesignIdFromQuery(
            this: AuthedContext
          ): Promise<string> {
            return getDesignIdFromStep(this.query.approvalStepId);
          }),
          canAccessDesignInState,
        ],
      },
    },
  }
);

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

  const trackingLink = yield buildTrackingLink(trx, created.id);

  this.status = 201;
  this.body = { ...created, trackingLink };
}

const router: CalaRouter = {
  prefix,
  routes: {
    ...routes,
    "/": {
      ...routes["/"],
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
  },
};

export default router;
