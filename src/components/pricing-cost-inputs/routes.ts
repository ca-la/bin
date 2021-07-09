import Router from "koa-router";
import uuid from "node-uuid";

import requireAdmin = require("../../middleware/require-admin");
import ProductDesignsDAO from "../product-designs/dao";
import { updateTechnicalDesignStepForDesign } from "../../services/approval-step-state";
import * as PricingCostInputsDAO from "./dao";
import {
  CreatePricingCostInputRequest,
  createPricingCostInputRequestSchema,
  PricingCostInput,
} from "./types";
import convert from "koa-convert";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import { StrictContext } from "../../router-context";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";

const router = new Router();

interface CreateContext extends StrictContext<PricingCostInput> {
  state: AuthedState &
    SafeBodyState<CreatePricingCostInputRequest> &
    TransactionState;
}

async function createCostInputs(ctx: CreateContext) {
  const {
    state: { trx, safeBody },
  } = ctx;
  const design = await ProductDesignsDAO.findById(
    safeBody.designId,
    undefined,
    undefined,
    trx
  );
  if (!design) {
    ctx.throw(404, `No design found for ID: ${safeBody.designId}`);
  }
  const {
    needsTechnicalDesigner = false,
    minimumOrderQuantity = 1,
    ...unsavedInputs
  } = safeBody;
  await updateTechnicalDesignStepForDesign(
    trx,
    design.id,
    needsTechnicalDesigner
  );
  const created = await PricingCostInputsDAO.create(trx, {
    createdAt: new Date(),
    deletedAt: null,
    designId: unsavedInputs.designId,
    expiresAt: null,
    id: uuid.v4(),
    materialBudgetCents: unsavedInputs.materialBudgetCents,
    materialCategory: unsavedInputs.materialCategory,
    minimumOrderQuantity,
    processes: unsavedInputs.processes,
    productComplexity: unsavedInputs.productComplexity,
    productType: unsavedInputs.productType,
  });

  ctx.body = created;
  ctx.status = 201;
}

function* getCostInputs(this: AuthedContext): Iterator<any, any, any> {
  const { designId, showExpired } = this.query;

  if (!designId) {
    this.throw(
      400,
      "You must provide a design ID when getting list of Cost Inputs"
    );
  }

  const design = yield ProductDesignsDAO.findById(designId);
  if (!design) {
    this.throw(404, `No design found for ID: ${designId}`);
  }

  const designInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(
    {
      designId,
      showExpired: showExpired === "true",
    }
  );

  this.body = designInputs;
  this.status = 200;
}

router.post(
  "/",
  requireAdmin,
  typeGuardFromSchema(createPricingCostInputRequestSchema),
  useTransaction,
  convert.back(createCostInputs)
);
router.get("/", requireAdmin, getCostInputs);

export default router.routes();
