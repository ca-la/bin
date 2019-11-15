import Router from 'koa-router';
import uuid from 'node-uuid';

import ProductDesignsDAO from '../product-designs/dao';
import * as PricingCostInputsDAO from './dao';
import requireAdmin = require('../../middleware/require-admin');
import PricingCostInput, { isUnsavedPricingCostInput } from './domain-object';

const router = new Router();

function* createCostInputs(
  this: AuthedContext<Unsaved<PricingCostInput>>
): Iterator<any, any, any> {
  const { body: inputs } = this.request;
  if (!inputs || (inputs && !isUnsavedPricingCostInput(inputs))) {
    this.throw(400, 'Request does not match model');
  }

  const design = yield ProductDesignsDAO.findById(inputs.designId);
  if (!design) {
    this.throw(404, `No design found for ID: ${inputs.designId}`);
  }

  const created = yield PricingCostInputsDAO.create({
    ...inputs,
    createdAt: new Date(),
    deletedAt: null,
    expiresAt: null,
    id: uuid.v4()
  });

  this.body = created;
  this.status = 201;
}

function* getCostInputs(this: AuthedContext): Iterator<any, any, any> {
  const { designId, showExpired } = this.query;

  if (!designId) {
    this.throw(
      400,
      'You must provide a design ID when getting list of Cost Inputs'
    );
  }

  const design = yield ProductDesignsDAO.findById(designId);
  if (!design) {
    this.throw(404, `No design found for ID: ${designId}`);
  }

  const designInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(
    {
      designId,
      showExpired: showExpired === 'true'
    }
  );

  this.body = designInputs;
  this.status = 200;
}

router.post('/', requireAdmin, createCostInputs);
router.get('/', requireAdmin, getCostInputs);

export default router.routes();
