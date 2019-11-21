import uuid from 'node-uuid';

import { test, Test } from '../../../test-helpers/fresh';
import createUser from '../../../test-helpers/create-user';
import { authHeader, post } from '../../../test-helpers/http';
import * as ShopifyProductsDAO from '../../../components/shopify-products/dao';
import * as ShopifyVariantsDAO from '../../../components/shopify-variants/dao';
import createDesign from '../../../services/create-design';
import { replaceForDesign } from '../../product-design-variants/dao';
import { omit } from 'lodash';

test('POST /integrations/shopify/products creates shopify products/variants', async (t: Test) => {
  const { session, user } = await createUser({ role: 'ADMIN' });
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

  const [response] = await post('/integrations/shopify/products', {
    headers: authHeader(session.id),
    body: {
      design: {
        [design.id]: '123456'
      },
      variants: {
        [variantId]: '56789'
      }
    }
  });

  t.equal(response.status, 204, 'responded with 204 no content');

  const shopifyProducts = await ShopifyProductsDAO.findByShopifyId('123456');

  t.deepEqual(
    omit(shopifyProducts[0], 'createdAt', 'id'),
    {
      deletedAt: null,
      designId: design.id,
      shopifyId: '123456'
    },
    'shopify product is inserted correctly'
  );

  const shopifyVariants = await ShopifyVariantsDAO.findByShopifyId('56789');

  t.deepEqual(
    omit(shopifyVariants[0], 'createdAt', 'id'),
    {
      deletedAt: null,
      shopifyId: '56789',
      shopifyProductId: shopifyProducts[0].id,
      variantId
    },
    'shopify variant is inserted correctly'
  );
});
