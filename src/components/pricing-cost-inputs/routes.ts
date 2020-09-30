import Knex from "knex";
import Router from "koa-router";
import uuid from "node-uuid";

import db from "../../services/db";
import requireAdmin = require("../../middleware/require-admin");
import ProductDesignsDAO from "../product-designs/dao";
import { updateTechnicalDesignStepForDesign } from "../../services/approval-step-state";
import * as PricingCostInputsDAO from "./dao";
import { isCreatePricingCostInputRequest, PricingCostInput } from "./types";

const router = new Router();

function* createCostInputs(this: AuthedContext): Iterator<any, any, any> {
  const { body: inputs } = this.request;
  if (!inputs) {
    this.throw(400, "Must include a request body");
  }

  if (!isCreatePricingCostInputRequest(inputs)) {
    this.throw(400, "Request does not match model");
  }

  const created = yield db.transaction(async (trx: Knex.Transaction) => {
    const design = await ProductDesignsDAO.findById(
      inputs.designId,
      undefined,
      undefined,
      trx
    );
    if (!design) {
      this.throw(404, `No design found for ID: ${inputs.designId}`);
    }
    const {
      needsTechnicalDesigner = false,
      minimumOrderQuantity = 1,
      ...unsavedInputs
    } = inputs;
    await updateTechnicalDesignStepForDesign(
      trx,
      design.id,
      needsTechnicalDesigner
    );
    return PricingCostInputsDAO.create(trx, {
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
  });

  this.body = created;
  this.status = 201;
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

router.post("/", requireAdmin, createCostInputs);
router.get("/", requireAdmin, getCostInputs);

export default router.routes();
