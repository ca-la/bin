import * as Knex from 'knex';
import uuid from 'node-uuid';

import db from '../../services/db';
import { test, Test } from '../../test-helpers/fresh';
import * as ShopifyVariantsDAO from './dao';
import * as ShopifyProductsDAO from '../shopify-products/dao';
import createUser from '../../test-helpers/create-user';
import createDesign from '../../services/create-design';
import { replaceForDesign } from '../product-design-variants/dao';

test('ShopifyVariantsDAO can save and retrieve products', async (t: Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    title: 'test',
    productType: 'product',
    userId: user.id
  });
  const variantId = uuid.v4();
  await replaceForDesign(design.id, [
    {
      colorName: 'Green',
      designId: design.id,
      id: variantId,
      position: 0,
      sizeName: 'M',
      unitsToProduce: 123,
      universalProductCode: '123456789012'
    }
  ]);

  await db.transaction(async (trx: Knex.Transaction) => {
    const shopifyProduct = await ShopifyProductsDAO.create(
      {
        createdAt: new Date(),
        deletedAt: null,
        designId: design.id,
        id: uuid.v4(),
        shopifyId: '12345'
      },
      trx
    );
    const created = await ShopifyVariantsDAO.create(
      {
        createdAt: new Date(),
        deletedAt: null,
        id: uuid.v4(),
        shopifyId: '12345',
        shopifyProductId: shopifyProduct.id,
        variantId
      },
      trx
    );
    const found = await ShopifyVariantsDAO.findById(created.id, trx);
    const foundByShopifyId = await ShopifyVariantsDAO.findByShopifyId(
      created.shopifyId,
      trx
    );

    t.deepEqual(created, found, 'objects are the same by id');
    t.deepEqual(
      [created],
      foundByShopifyId,
      'objects are the same by shopify id'
    );
    return;
  });
});
