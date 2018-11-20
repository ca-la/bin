import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as ProductDesignsDAO from '../../dao/product-designs';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import { hasProperties } from '../../services/require-properties';
import requireAdmin = require('../../middleware/require-admin');
import PricingCostInput from '../../domain-objects/pricing-cost-input';

const router = new Router();

function isUnsavedPricingCostInput(candidate: object): candidate is Unsaved<PricingCostInput> {
  return hasProperties(
    candidate,
    'productType',
    'productComplexity',
    'materialCategory',
    'materialBudgetCents',
    'processes',
    'designId'
  );
}

function* createCostInputs(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body: inputs } = this.request;
  if (!inputs || inputs && !isUnsavedPricingCostInput(inputs)) {
    this.throw(400, 'Request does not match model');
    return;
  }

  const design = yield ProductDesignsDAO.findById(inputs.designId);
  if (!design) {
    this.throw(404, `No design found for ID: ${inputs.designId}`);
    return;
  }

  const created = yield PricingCostInputsDAO.create({
    ...inputs,
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4()
  });

  this.body = created;
  this.status = 201;
}

function* getCostInputs(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { designId } = this.query;

  if (!designId) {
    this.throw(400, 'You must provide a design ID when getting list of Cost Inputs');
    return;
  }

  const design = yield ProductDesignsDAO.findById(designId);
  if (!design) {
    this.throw(404, `No design found for ID: ${designId}`);
    return;
  }

  const designInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(designId);

  this.body = designInputs;
  this.status = 200;
}

router.post('/', requireAdmin, createCostInputs);
router.get('/', requireAdmin, getCostInputs);

module.exports = router.routes();