import { DesignAndVariantToShopifyIds } from '@cala/ts-lib';
import { create as createShopifyProduct } from '../../shopify-products/dao';
import { create as createShopifyVariant } from '../../shopify-variants/dao';
import * as db from '../../../services/db';
import Knex = require('knex');
import uuid from 'node-uuid';

export async function create(
  data: DesignAndVariantToShopifyIds
): Promise<void> {
  const designId = Object.keys(data.design)[0];
  const shopifyId = data.design[designId];
  return db.transaction(async (trx: Knex.Transaction) => {
    const shopifyProduct = await createShopifyProduct(
      {
        createdAt: new Date(),
        deletedAt: null,
        designId,
        id: uuid.v4(),
        shopifyId
      },
      trx
    );
    for (const variantId of Object.keys(data.variants)) {
      await createShopifyVariant(
        {
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          shopifyId: data.variants[variantId],
          shopifyProductId: shopifyProduct.id,
          variantId
        },
        trx
      );
    }
  });
}
