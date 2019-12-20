import uuid from 'node-uuid';
import { HermesMessageType, ProviderName } from '@cala/ts-lib';
import * as HermesService from '../../components/hermes/send-message';
import * as CollectionsDAO from '../../components/collections/dao';
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import createUser = require('../../test-helpers/create-user');
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { createStorefront } from '../create-storefront';
import { addDesign } from '../../test-helpers/collections';
import { createShopifyProductsForCollection } from '.';

test('createShopifyProductsForCollection creates a Hermes message for each design', async (t: Test) => {
  const sendMessageStub = sandbox()
    .stub(HermesService, 'sendMessage')
    .resolves();

  const { user } = await createUser();
  const storefront = await createStorefront({
    userId: user.id,
    accessToken: 'token-foo',
    name: 'The Gift Shop',
    baseUrl: 'gift.shop',
    providerName: ProviderName.SHOPIFY
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await addDesign(collection.id, design.id);

  const design2 = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design 2',
    userId: user.id
  });
  await addDesign(collection.id, design2.id);

  await createShopifyProductsForCollection(user.id, collection.id);

  t.deepEqual(sendMessageStub.firstCall.args[0], {
    storefrontId: storefront.id,
    designId: design2.id,
    type: HermesMessageType.SHOPIFY_PRODUCT_CREATE
  });
  t.deepEqual(sendMessageStub.secondCall.args[0], {
    storefrontId: storefront.id,
    designId: design.id,
    type: HermesMessageType.SHOPIFY_PRODUCT_CREATE
  });
});
