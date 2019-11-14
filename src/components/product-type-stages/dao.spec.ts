import uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import * as ProductTypeStagesDAO from './dao';
import generatePricingProductType from '../../test-helpers/factories/pricing-product-type';

test('ProductTypeStagesDAO can create and find by product type id', async (t: Test) => {
  const id = uuid.v4();
  const id2 = uuid.v4();
  const productTypeId = uuid.v4();
  const stageTemplateId = uuid.v4();
  const stageTemplateId2 = uuid.v4();
  const { pricingProductType } = await generatePricingProductType({
    id: productTypeId
  });

  const created = await ProductTypeStagesDAO.create({
    id,
    pricingProductTypeId: pricingProductType.id,
    stageTemplateId
  });

  try {
    await ProductTypeStagesDAO.create({
      id: id2,
      pricingProductTypeId: pricingProductType.id,
      stageTemplateId
    });
    t.fail('Should not succeed.');
  } catch (error) {
    t.true(
      error.message.includes(
        'duplicate key value violates unique constraint "unique_type_and_stage"'
      )
    );
  }

  const created2 = await ProductTypeStagesDAO.create({
    id: id2,
    pricingProductTypeId: pricingProductType.id,
    stageTemplateId: stageTemplateId2
  });

  t.deepEqual(created, {
    id,
    pricingProductTypeId: pricingProductType.id,
    stageTemplateId
  });
  t.deepEqual(created2, {
    id: id2,
    pricingProductTypeId: pricingProductType.id,
    stageTemplateId: stageTemplateId2
  });

  const results = await ProductTypeStagesDAO.findAllByProductType(
    pricingProductType.id
  );
  t.deepEqual(results, [created, created2]);
});
