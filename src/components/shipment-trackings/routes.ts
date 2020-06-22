import Knex from "knex";
import { buildRouter } from "../../services/cala-component/cala-router";
import requireAuth = require("../../middleware/require-auth");
import {
  requireDesignIdBy,
  canAccessDesignInState,
} from "../../middleware/can-access-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";

import { ShipmentTracking, domain } from "./types";
import dao from "./dao";
import { requireQueryParam } from "../../middleware/require-query-param";

async function getDesignIdFromStep(this: AuthedContext): Promise<string> {
  const { approvalStepId } = this.query;

  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, approvalStepId)
  );
  if (!step) {
    throw new Error(`Step not found with ID: ${approvalStepId}`);
  }

  return step.designId;
}

const standardRouter = buildRouter<ShipmentTracking>(
  domain,
  "/shipment-trackings",
  dao,
  {
    pickRoutes: ["find"],
    routeOptions: {
      find: {
        allowedFilterAttributes: ["approvalStepId"],
        middleware: [
          requireAuth,
          requireQueryParam("approvalStepId"),
          requireDesignIdBy(getDesignIdFromStep),
          canAccessDesignInState,
        ],
      },
    },
  }
);

export default standardRouter;
